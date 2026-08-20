import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('No SMTP config found. Emails will be logged to console only.');
    }
  }

  async sendVerificationEmail(to: string, name: string, url: string) {
    const subject = 'Verify your email address';

    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Hello ${this.escapeHtml(name)},</h2>
        <p>Thanks for signing up. Please verify your email address by clicking the button below:</p>
        <a href="${this.escapeHtml(url)}"
           style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">This link expires in 24 hours. If you did not sign up, you can safely ignore this email.</p>
      </div>
    `;

    if (this.transporter) {
      await this.transporter.sendMail({
        from: `"Secure Login Demo" <${process.env.SMTP_FROM ?? 'noreply@example.com'}>`,
        to,
        subject,
        html,
        headers: {
          'X-Resend-Track-Clicks': 'false',
          'X-Resend-Track-Opens': 'false',
        },
      });

      this.logger.log(`Verification email sent to ${to}`);
    } else {
      this.logger.log(`\n═══════════════════════════════════════════════════════`);
      this.logger.log(`📧 VERIFICATION EMAIL (console fallback)`);
      this.logger.log(`   To: ${to}`);
      this.logger.log(`   Subject: ${subject}`);
      this.logger.log(`   Link: ${url}`);
      this.logger.log(`═══════════════════════════════════════════════════════\n`);
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}