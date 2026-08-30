import { env } from '../../config/env.js';

function wrap(title, bodyHtml) {
  const supportLine = env.SUPPORT_EMAIL
    ? `<p style="color:#94a3b8;font-size:12px;margin-top:4px;">Need help? Contact <a href="mailto:${env.SUPPORT_EMAIL}" style="color:#94a3b8;">${env.SUPPORT_EMAIL}</a></p>`
    : '';
  return `<!doctype html><html><body style="font-family:sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;">
      <h1 style="font-size:18px;color:#0f172a;">${title}</h1>
      ${bodyHtml}
      <p style="color:#94a3b8;font-size:12px;margin-top:32px;">Surprise Real Estate — Property Management System</p>
      ${supportLine}
    </div>
  </body></html>`;
}

export function verificationEmail(token) {
  const url = `${env.CLIENT_URL}/verify-email?token=${token}`;
  return {
    subject: 'Verify your Surprise Real Estate account',
    text: `Verify your email: ${url} (expires in 24 hours)`,
    html: wrap('Verify your email', `<p>Confirm your email address to activate your account.</p>
      <p><a href="${url}" style="color:#2563eb;">Verify email address</a></p>
      <p style="color:#64748b;font-size:13px;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>`),
  };
}

export function inviteEmail(token, { organizationName, invitedByName }) {
  const url = `${env.CLIENT_URL}/set-password?token=${token}`;
  return {
    subject: `You've been invited to ${organizationName} on Surprise Real Estate`,
    text: `${invitedByName} invited you to join ${organizationName} on Surprise Real Estate. Set your password: ${url} (expires in 7 days)`,
    html: wrap(`You're invited to ${organizationName}`, `<p>${invitedByName} invited you to join <strong>${organizationName}</strong> on Surprise Real Estate.</p>
      <p><a href="${url}" style="color:#2563eb;">Set your password to get started</a></p>
      <p style="color:#64748b;font-size:13px;">This link expires in 7 days. If you weren't expecting this invitation, you can ignore this email.</p>`),
  };
}

export function inspectionScheduledEmail({ propertyName, unitLabel, inspectionType, inspectionDate }) {
  const formattedDate = new Date(inspectionDate).toLocaleDateString('en-US', { dateStyle: 'long' });
  const where = unitLabel ? `${propertyName} — ${unitLabel}` : propertyName;
  return {
    subject: `Upcoming inspection at ${where}`,
    text: `A ${inspectionType.replace('_', ' ')} inspection has been scheduled at ${where} on ${formattedDate}.`,
    html: wrap('Upcoming inspection', `<p>A <strong>${inspectionType.replace('_', ' ')}</strong> inspection has been scheduled for your residence.</p>
      <p><strong>Where:</strong> ${where}<br/><strong>When:</strong> ${formattedDate}</p>
      <p style="color:#64748b;font-size:13px;">Please make sure the unit is accessible around this time. Contact your property manager if you have any questions or need to reschedule.</p>`),
  };
}

export function passwordResetEmail(token) {
  const url = `${env.CLIENT_URL}/reset-password?token=${token}`;
  return {
    subject: 'Reset your Surprise Real Estate password',
    text: `Reset your password: ${url} (expires in 15 minutes)`,
    html: wrap('Reset your password', `<p>We received a request to reset your password.</p>
      <p><a href="${url}" style="color:#2563eb;">Reset password</a></p>
      <p style="color:#64748b;font-size:13px;">This link expires in 15 minutes. If you didn't request this, you can safely ignore this email — your password will not change.</p>`),
  };
}
