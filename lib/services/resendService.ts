import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface SendMagicLinkParams {
  email: string;
  magicLinkUrl: string;
}

export async function sendMagicLinkEmail({ email, magicLinkUrl }: SendMagicLinkParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: false, error: 'RESEND_API_KEY is not configured in .env.local' };
  }

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Instangalog <auth@echostamp.online>';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Your Instangalog Magic Sign-In Link',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Sign In to Instangalog</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #ffffff; margin: 0; padding: 40px 20px;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 24px; padding: 32px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
            <div style="width: 64px; height: 64px; margin: 0 auto 20px; border-radius: 16px; overflow: hidden;">
              <img src="https://instangalogpagpag.vercel.app/pagpag.png" alt="Instangalog Logo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px;" />
            </div>
            
            <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 12px;">Sign In to Instangalog</h1>
            
            <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 28px;">
              Click the button below to sign in to your account. This magic link is valid for 10 minutes and requires no password.
            </p>

            <a href="${magicLinkUrl}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #ffffff; color: #000000; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 24px; border-radius: 12px; transition: all 0.2s;">
              Click Here to Sign In Now &rarr;
            </a>

            <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #1f2937; font-size: 12px; color: #6b7280;">
              <p style="margin: 0;">If you didn't request this email, you can safely ignore it.</p>
              <p style="margin: 6px 0 0; font-family: monospace; font-size: 11px; word-break: break-all;">${magicLinkUrl}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('[Resend Error]', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Resend Exception]', err);
    return { success: false, error: err.message || 'Failed to send email via Resend' };
  }
}
