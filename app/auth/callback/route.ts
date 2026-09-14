import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClientServer } from '@/lib/supabase/server';

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
  const next = searchParams.get('next') ?? '/';

  try {
    const supabase = await createClientServer();

    // 1. Handle PKCE Code Exchange
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.warn('[Auth Callback] Code exchange error:', error.message);
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

      if (!otpRes.error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.warn('[Auth Callback] Token hash verification error:', otpRes.error.message);
    }
  } catch (err) {
    console.error('[Auth Callback Exception]', err);
  }

  // 3. Fallback: Redirect home so client-side Supabase SDK auto-restores session from URL hash or cookies
  return NextResponse.redirect(`${origin}${next}`);
}
