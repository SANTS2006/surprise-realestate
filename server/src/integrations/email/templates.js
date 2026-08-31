import { env } from '../../config/env.js';

const dateTimeFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short' });

// Shared branded shell for every transactional email — a navy header band
// (wordmark + a static pill naming the email's purpose), an eyebrow/heading/
// body, an optional details table, an optional CTA panel with a button, and
// a footer with a "need help" row + boilerplate. Every value is passed in
// pre-escaped/plain text (no HTML from user input ever reaches here) since
// none of these templates render anything other than our own copy and
// already-trusted domain data (org names, property/unit labels, dates).
function renderEmail({ headerLabel, eyebrow, heading, paragraphs, detailsRows, cta, disclaimer }) {
  const detailsHtml = detailsRows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #E2E8F0;border-radius:8px;background:#F8FAFC;overflow:hidden;">
        ${detailsRows.map(({ label, value, valueColor }, i) => {
          const border = i === detailsRows.length - 1 ? 'none' : '1px solid #E2E8F0';
          return `
          <tr>
            <td style="padding:12px 16px;color:#64748B;font-size:11px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;border-bottom:${border};">${label}</td>
            <td style="padding:12px 16px;color:${valueColor ?? '#0F172A'};font-size:13px;font-weight:500;text-align:right;border-bottom:${border};">${value}</td>
          </tr>`;
        }).join('')}
      </table>`
    : '';

  const ctaHtml = cta
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#EAF4FB;border-radius:12px;">
        <tr><td align="center" style="padding:28px 24px;">
          <div style="width:48px;height:48px;line-height:48px;border-radius:50%;background:#FFFFFF;margin:0 auto 14px;text-align:center;">
            <span style="font-size:20px;">${cta.icon ?? '🔒'}</span>
          </div>
          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0F172A;">${cta.heading}</p>
          <p style="margin:0 0 18px;font-size:13px;color:#64748B;">${cta.description}</p>
          <a href="${cta.href}" style="display:inline-block;background:#00529B;color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:8px;">${cta.buttonText}</a>
        </td></tr>
      </table>`
    : '';

  const disclaimerHtml = disclaimer
    ? `<p style="margin:0 0 4px;font-size:12px;color:#94A3B8;">${disclaimer}</p>`
    : '';

  const supportHtml = env.SUPPORT_EMAIL
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;padding-top:20px;border-top:1px solid #E2E8F0;">
        <tr>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-size:13px;font-weight:600;color:#334155;">Need help?</p>
            <p style="margin:2px 0 0;font-size:12px;color:#94A3B8;">Contact the Surprise Real Estate support team.</p>
          </td>
          <td align="right" style="vertical-align:middle;">
            <a href="mailto:${env.SUPPORT_EMAIL}" style="display:inline-block;border:1px solid #CBD5E1;color:#334155;font-size:11px;font-weight:700;letter-spacing:0.4px;text-decoration:none;padding:8px 16px;border-radius:999px;">SUPPORT</a>
          </td>
        </tr>
      </table>`
    : '';

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:#002956;padding:22px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <p style="margin:0;font-size:17px;font-weight:700;color:#FFFFFF;">Surprise Real Estate</p>
                      <p style="margin:2px 0 0;font-size:9px;font-weight:600;letter-spacing:1.5px;color:#A8C6E0;text-transform:uppercase;">Property Management</p>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <span style="display:inline-block;border:1px solid rgba(255,255,255,0.35);color:#FFFFFF;font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;padding:6px 12px;border-radius:999px;">${headerLabel}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#0078C8;">${eyebrow}</p>
                <h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#0F172A;">${heading}</h1>
                <p style="margin:0 0 4px;font-size:14px;color:#475569;">Hello,</p>
                ${paragraphs.map((p) => `<p style="margin:6px 0;font-size:14px;line-height:1.6;color:#475569;">${p}</p>`).join('')}
                ${detailsHtml}
                ${ctaHtml}
                ${disclaimerHtml}
                ${supportHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#F8FAFC;border-top:1px solid #E2E8F0;">
                <p style="margin:0;font-size:11px;color:#94A3B8;text-align:center;">This is an automated email. Please do not reply to this message.</p>
                <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;text-align:center;">© ${new Date().getFullYear()} Surprise Real Estate. All rights reserved.</p>
                <p style="margin:4px 0 0;font-size:11px;color:#CBD5E1;text-align:center;font-style:italic;">Modern property management, done right.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body></html>`;
}

export function verificationEmail(token) {
  const url = `${env.CLIENT_URL}/verify-email?token=${token}`;
  return {
    subject: 'Verify your Surprise Real Estate account',
    text: `Verify your email: ${url} (expires in 24 hours)`,
    html: renderEmail({
      headerLabel: 'Verify Email',
      eyebrow: 'Account verification',
      heading: 'Verify your email',
      paragraphs: ['Confirm your email address to activate your Surprise Real Estate account.'],
      detailsRows: [{ label: 'Link expires', value: '24 hours from now', valueColor: '#DC2626' }],
      cta: { icon: '✉️', heading: 'Confirm your email', description: 'One click and your account is ready to go.', href: url, buttonText: 'Verify Email' },
      disclaimer: "If you didn't create this account, you can safely ignore this email.",
    }),
  };
}

export function inviteEmail(token, { organizationName, invitedByName }) {
  const url = `${env.CLIENT_URL}/set-password?token=${token}`;
  return {
    subject: `You've been invited to ${organizationName} on Surprise Real Estate`,
    text: `${invitedByName} invited you to join ${organizationName} on Surprise Real Estate. Set your password: ${url} (expires in 7 days)`,
    html: renderEmail({
      headerLabel: 'Invitation',
      eyebrow: "You're invited",
      heading: `Join ${organizationName}`,
      paragraphs: [`<strong>${invitedByName}</strong> invited you to join <strong>${organizationName}</strong> on Surprise Real Estate.`],
      detailsRows: [
        { label: 'Organization', value: organizationName },
        { label: 'Invited by', value: invitedByName },
        { label: 'Link expires', value: '7 days from now', valueColor: '#DC2626' },
      ],
      cta: { icon: '🔑', heading: 'Set your password', description: 'Activate your account to get started.', href: url, buttonText: 'Accept Invitation' },
      disclaimer: "If you weren't expecting this invitation, you can safely ignore this email.",
    }),
  };
}

export function inspectionScheduledEmail({ propertyName, unitLabel, inspectionType, inspectionDate }) {
  const formattedDate = new Date(inspectionDate).toLocaleDateString('en-US', { dateStyle: 'long' });
  const where = unitLabel ? `${propertyName} — ${unitLabel}` : propertyName;
  const typeLabel = inspectionType.replace('_', ' ');
  return {
    subject: `Upcoming inspection at ${where}`,
    text: `A ${typeLabel} inspection has been scheduled at ${where} on ${formattedDate}.`,
    html: renderEmail({
      headerLabel: 'Inspection Notice',
      eyebrow: 'Maintenance',
      heading: 'Upcoming inspection',
      paragraphs: [`A <strong>${typeLabel}</strong> inspection has been scheduled for your residence.`],
      detailsRows: [
        { label: 'Property', value: where },
        { label: 'Type', value: typeLabel },
        { label: 'Date', value: formattedDate },
      ],
      cta: { icon: '📋', heading: 'Prepare for your inspection', description: 'Please make sure the unit is accessible around this time.', href: `${env.CLIENT_URL}/inspections`, buttonText: 'View Details' },
      disclaimer: 'Contact your property manager if you have any questions or need to reschedule.',
    }),
  };
}

export function passwordResetEmail(token) {
  const url = `${env.CLIENT_URL}/reset-password?token=${token}`;
  const now = new Date();
  const expires = new Date(now.getTime() + 15 * 60 * 1000);
  return {
    subject: 'Reset your Surprise Real Estate password',
    text: `Reset your password: ${url} (expires in 15 minutes)`,
    html: renderEmail({
      headerLabel: 'Password Reset',
      eyebrow: 'Security alert',
      heading: 'Reset your password',
      paragraphs: ['We received a request to reset the password for your Surprise Real Estate account.'],
      detailsRows: [
        { label: 'Requested at', value: dateTimeFmt.format(now) },
        { label: 'Expires at', value: dateTimeFmt.format(expires), valueColor: '#DC2626' },
      ],
      cta: { icon: '🔒', heading: 'Secure your account', description: 'This password reset link is valid for 15 minutes only.', href: url, buttonText: 'Reset Password' },
      disclaimer: "For your security, never share this reset link with anyone. If you didn't request this, you can safely ignore this email.",
    }),
  };
}
