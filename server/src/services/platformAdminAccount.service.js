import { AppError } from '../utils/AppError.js';
import { hashPassword, verifyPassword, assertPasswordPolicy } from '../auth/password.js';
import { generateRawToken } from '../auth/crypto.js';
import { sendMail } from '../integrations/email/mailer.js';
import { platformAdminResetEmail, platformAdminInviteEmail } from '../integrations/email/templates.js';
import {
  findPlatformAdminByEmail, findPlatformAdminById, findAllPlatformAdmins, countActivePlatformAdmins,
  createPlatformAdmin, updatePlatformAdmin, setPlatformAdminPassword,
  createPlatformAdminResetToken, findValidPlatformAdminResetToken, invalidatePlatformAdminResetTokens,
  markPlatformAdminResetTokenUsed,
} from '../repositories/platformAdmin.repository.js';
import { logger } from '../config/logger.js';

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function serializePlatformAdmin(admin) {
  return {
    id: admin.id,
    firstName: admin.firstName,
    lastName: admin.lastName,
    email: admin.email,
    isActive: admin.isActive,
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
  };
}

// ── Password reset (forgot password) ────────────────────────────────────

// Same generic response whether or not the email belongs to an active
// platform admin, so the form can't be used to find out who has an account.
export async function requestPasswordReset(email) {
  const admin = await findPlatformAdminByEmail(email);
  if (admin?.isActive) {
    await invalidatePlatformAdminResetTokens(admin.id);
    const rawToken = generateRawToken();
    await createPlatformAdminResetToken(admin.id, rawToken, new Date(Date.now() + RESET_TOKEN_TTL_MS));
    const { subject, html, text } = platformAdminResetEmail(rawToken);
    await sendMail({ to: admin.email, subject, html, text });
    logger.info({ platformAdminId: admin.id }, 'platform admin password reset requested');
  }
  return { message: 'If a platform admin account with that email exists, a password reset link has been sent.' };
}

// Also completes an invite: a newly added admin is created with a random,
// never-transmitted password and gets a long-lived link of the same kind.
export async function resetPasswordWithToken({ token, password }) {
  const tokenRow = await findValidPlatformAdminResetToken(token);
  if (!tokenRow) throw AppError.badRequest('This password reset link is invalid or has expired.');

  const admin = await findPlatformAdminById(tokenRow.platformAdminId);
  if (!admin || !admin.isActive) throw AppError.badRequest('This password reset link is invalid or has expired.');

  assertPasswordPolicy(password, { email: admin.email, firstName: admin.firstName, lastName: admin.lastName });
  await setPlatformAdminPassword(admin.id, await hashPassword(password));
  await markPlatformAdminResetTokenUsed(tokenRow.id);
  await invalidatePlatformAdminResetTokens(admin.id);

  logger.info({ platformAdminId: admin.id }, 'platform admin password reset completed');
  return { reset: true };
}

// ── Own account ─────────────────────────────────────────────────────────

export async function changeOwnPassword(adminId, { currentPassword, newPassword }) {
  const admin = await findPlatformAdminById(adminId);
  if (!admin) throw AppError.unauthorized();

  if (!(await verifyPassword(admin.passwordHash, currentPassword))) {
    throw AppError.badRequest('Your current password is incorrect.');
  }
  if (currentPassword === newPassword) {
    throw AppError.badRequest('Choose a new password that is different from your current one.');
  }

  assertPasswordPolicy(newPassword, { email: admin.email, firstName: admin.firstName, lastName: admin.lastName });
  await setPlatformAdminPassword(admin.id, await hashPassword(newPassword));
  logger.info({ platformAdminId: admin.id }, 'platform admin changed their password');
  return { changed: true };
}

export async function updateOwnProfile(adminId, { firstName, lastName }) {
  const admin = await updatePlatformAdmin(adminId, { firstName, lastName });
  return serializePlatformAdmin(admin);
}

// ── Managing other platform admins ──────────────────────────────────────

export async function listPlatformAdmins() {
  const admins = await findAllPlatformAdmins();
  return admins.map(serializePlatformAdmin);
}

// The new admin never receives a usable password: a random one is stored
// only to satisfy the not-null column, and the way in is the emailed
// "set your password" link.
export async function createPlatformAdminByAdmin({ firstName, lastName, email }, actingAdminId) {
  const existing = await findPlatformAdminByEmail(email);
  if (existing) throw AppError.conflict('A platform admin with this email already exists.');

  const inviter = await findPlatformAdminById(actingAdminId);
  const admin = await createPlatformAdmin({
    firstName, lastName, email, passwordHash: await hashPassword(generateRawToken(32)),
  });

  const rawToken = generateRawToken();
  await createPlatformAdminResetToken(admin.id, rawToken, new Date(Date.now() + INVITE_TOKEN_TTL_MS));
  try {
    const { subject, html, text } = platformAdminInviteEmail(rawToken, { invitedByName: `${inviter.firstName} ${inviter.lastName}` });
    await sendMail({ to: admin.email, subject, html, text });
  } catch (err) {
    logger.error({ err, platformAdminId: admin.id }, 'failed to send platform admin invite');
  }

  logger.info({ platformAdminId: admin.id, createdBy: actingAdminId }, 'platform admin created');
  return serializePlatformAdmin(admin);
}

export async function setPlatformAdminActive(id, isActive, actingAdminId) {
  const target = await findPlatformAdminById(id);
  if (!target) throw AppError.notFound('Platform admin not found.');

  if (!isActive) {
    if (id === actingAdminId) throw AppError.badRequest('You cannot deactivate your own account.');
    if (target.isActive && (await countActivePlatformAdmins()) <= 1) {
      throw AppError.badRequest('At least one platform admin must stay active.');
    }
  }

  const admin = await updatePlatformAdmin(id, { isActive });
  logger.info({ platformAdminId: id, isActive, by: actingAdminId }, 'platform admin status changed');
  return serializePlatformAdmin(admin);
}
