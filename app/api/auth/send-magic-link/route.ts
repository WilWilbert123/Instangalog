import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendMagicLinkEmail } from '@/lib/services/resendService';

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
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = `${origin}/auth/callback`;

    // Check if Resend API key is configured
    if (process.env.RESEND_API_KEY) {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: cleanEmail,
          options: {
            redirectTo,
          },
        });

        if (error) {
          console.warn('[Admin GenerateLink Error]', error.message);
        } else if (data?.properties?.action_link) {
          const resendResult = await sendMagicLinkEmail({
            email: cleanEmail,
            magicLinkUrl: data.properties.action_link,
          });

          if (resendResult.success) {
            return NextResponse.json({
              success: true,
              provider: 'resend',
              message: 'Magic link sent via Resend API',
            });
          }
          console.warn('[Resend API Error]', resendResult.error);
        }
      } catch (err: any) {
        console.warn('[Resend Flow Fallback]', err.message);
      }
    }

    // Fallback if RESEND_API_KEY is not set or failed: use Supabase client OTP
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
