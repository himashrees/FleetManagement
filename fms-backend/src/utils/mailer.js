const nodemailer = require('nodemailer');

/**
 * Lazily builds a nodemailer transporter from env vars.
 * Expected vars (all optional — see fallback below):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM
 *
 * If SMTP_HOST is not set, the app falls back to a "console transport"
 * that just logs the email to the server console. This means Forgot
 * Password works out of the box in development/demo without needing
 * a real mail account — the reset link shows up in your backend terminal.
 */
function buildTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

async function sendPasswordResetEmail(toEmail, resetUrl, userName) {
  const transporter = buildTransporter();
  const subject = 'FleetOS — Reset your password';
  const text = `Hi ${userName || ''},\n\nWe received a request to reset your FleetOS password.\nClick the link below to choose a new password (valid for 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\n— FleetOS`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#1d4ed8;">FleetOS Password Reset</h2>
      <p>Hi ${userName || ''},</p>
      <p>We received a request to reset your FleetOS password. Click the button below to choose a new one. This link is valid for <strong>1 hour</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Reset Password</a>
      </p>
      <p style="color:#64748b;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
    </div>`;

  if (!transporter) {
    // Dev/demo fallback — no SMTP configured, just log it.
    console.log('\n📧 ──── PASSWORD RESET EMAIL (no SMTP configured — showing here instead) ────');
    console.log(`To: ${toEmail}`);
    console.log(`Reset link: ${resetUrl}`);
    console.log('──────────────────────────────────────────────────────────────────────────\n');
    return { simulated: true };
  }

  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'FleetOS <no-reply@fleetos.local>',
    to: toEmail,
    subject,
    text,
    html,
  });
}

module.exports = { sendPasswordResetEmail };