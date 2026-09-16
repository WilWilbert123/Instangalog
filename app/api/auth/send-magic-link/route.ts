import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendMagicLinkEmail } from '@/lib/services/resendService';
import { upsertProfile } from '@/lib/services/chatService';
import { registerPendingMagicLink } from '@/lib/auth/magicLinkStore';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const host = req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const origin = req.headers.get('origin') || (host ? `${protocol}://${host}` : null) || process.env.NEXT_PUBLIC_APP_URL || 'https://instangalogpagpag.vercel.app';
    const redirectTo = `${origin}/auth/callback`;

    // 1. Ensure user account exists in auth.users & public.profiles
    let targetUser = null;
    try {
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      targetUser = userList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
    } catch (err) {
      console.warn('[Send Magic Link] List users warning:', err);
    }

    if (!targetUser) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: true,
        user_metadata: {
          full_name: cleanEmail.split('@')[0],
        },
      });

      if (createError) {
        console.warn('[Send Magic Link] Create user warning:', createError.message);
      } else if (newUser?.user) {
        targetUser = newUser.user;
      }
    }

    if (targetUser) {
      // Ensure profile exists in public.profiles table immediately
      await upsertProfile({
        id: targetUser.id,
        email: cleanEmail,
        user_metadata: targetUser.user_metadata,
      });

      // Register pending link for real-time heartbeat sync
      registerPendingMagicLink(cleanEmail, targetUser.id);
    }

    // 2. Generate link & send via Resend API
    if (process.env.RESEND_API_KEY) {
      try {
        let { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: cleanEmail,
          options: {
            redirectTo,
          },
        });

        if (error) {
          console.warn('[Admin GenerateLink Error]', error.message);
          let msg = error.message;
          if (msg.includes('rate limit') || msg.includes('security purposes') || msg.includes('after')) {
            msg = 'For security purposes, you can only request this after 60 seconds.';
          }
          return NextResponse.json(
            { success: false, error: msg },
            { status: 429 }
          );
        }

        if (data?.properties) {
          // Construct direct, robust token_hash link with email parameter
          let magicLinkUrl = data.properties.action_link;
          if (data.properties.hashed_token) {
            magicLinkUrl = `${origin}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&email=${encodeURIComponent(cleanEmail)}`;
          }

          const resendResult = await sendMagicLinkEmail({
            email: cleanEmail,
            magicLinkUrl,
          });

          if (resendResult.success) {
            return NextResponse.json({
              success: true,
              provider: 'resend',
              message: 'Magic link sent via Resend API',
            });
          }

          console.warn('[Resend API Error]', resendResult.error);
          return NextResponse.json(
            { success: false, error: resendResult.error || 'Failed to send magic link email via Resend' },
            { status: 500 }
          );
        }
      } catch (err: any) {
        console.warn('[Resend Flow Exception]', err.message);
        return NextResponse.json(
          { success: false, error: err.message || 'Error generating magic link' },
          { status: 500 }
        );
      }
    }

    // Fallback if RESEND_API_KEY is not set at all: use standard Supabase OTP flow
    return NextResponse.json({
      success: true,
      provider: 'supabase',
      message: 'Using standard Supabase OTP email flow',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send magic link' },
      { status: 500 }
    );
  }
}
