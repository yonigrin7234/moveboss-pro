import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  // Skip if no API key (development)
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] Skipping email (no API key):', options.subject);
    return { success: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'MoveBoss Pro <notifications@movebosspro.com>',
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('[Email] Send error:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Sent successfully:', data?.id);
    return { success: true };
  } catch (error) {
    console.error('[Email] Exception:', error);
    return { success: false, error: String(error) };
  }
}
