import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClientServer } from '@/lib/supabase/server';
import { upsertProfile } from '@/lib/services/chatService';
import { setMagicLinkVerified } from '@/lib/auth/magicLinkStore';

/**
 * /auth/callback
 *
 * Handles magic link email callbacks and OAuth redirects from Supabase.
 * Supports PKCE `code` exchange, `token_hash` OTP verification, and client hash auto-login.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as any;
  const emailParam = searchParams.get('email');
  const next = searchParams.get('next') ?? '/';

  try {
    const supabase = await createClientServer();

    // 1. Handle PKCE Code Exchange
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.user) {
        await upsertProfile({
          id: data.user.id,
          email: data.user.email || '',
          user_metadata: data.user.user_metadata,
        });

        const targetEmail = data.user.email || emailParam;
        if (targetEmail) {
          setMagicLinkVerified(
            targetEmail,
            data.user.id,
            data.session
              ? { access_token: data.session.access_token, refresh_token: data.session.refresh_token }
              : undefined
          );
        }

        return NextResponse.redirect(`${origin}${next}`);
      }
      if (error) console.warn('[Auth Callback] Code exchange error:', error.message);
    }

    // 2. Handle Magic Link Token Hash Verification
    if (tokenHash) {
      let otpRes = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type || 'magiclink',
      });

      if (otpRes.error) {
        // Fallback retry with 'email' type if 'magiclink' fails
        otpRes = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'email',
        });
      }

      if (!otpRes.error && otpRes.data.user) {
        await upsertProfile({
          id: otpRes.data.user.id,
          email: otpRes.data.user.email || '',
          user_metadata: otpRes.data.user.user_metadata,
        });

        const targetEmail = otpRes.data.user.email || emailParam;
        if (targetEmail) {
          setMagicLinkVerified(
            targetEmail,
            otpRes.data.user.id,
            otpRes.data.session
              ? { access_token: otpRes.data.session.access_token, refresh_token: otpRes.data.session.refresh_token }
              : undefined
          );
        }

        return NextResponse.redirect(`${origin}${next}`);
      }
      if (otpRes.error) console.warn('[Auth Callback] Token hash verification error:', otpRes.error.message);
    }
  } catch (err) {
    console.error('[Auth Callback Exception]', err);
  }

  // 3. Fallback: Redirect home so client-side Supabase SDK auto-restores session from URL hash or cookies
  return NextResponse.redirect(`${origin}${next}`);
}
