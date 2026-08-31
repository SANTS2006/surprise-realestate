import { randomUUID } from 'node:crypto';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { hashPassword, verifyPassword, assertPasswordPolicy } from '../auth/password.js';
import { generateRawToken } from '../auth/crypto.js';
import {
  signAccessToken, signRefreshToken, verifyRefreshToken,
  signMfaChallengeToken, verifyMfaChallengeToken,
} from '../auth/jwt.js';
import {
  generateTotpSecret, buildOtpAuthUrl, encryptTotpSecret, verifyTotpCode,
  generateRecoveryCodes, hashRecoveryCode,
} from '../auth/mfa.js';
import { sendMail } from '../integrations/email/mailer.js';
import { verificationEmail, passwordResetEmail } from '../integrations/email/templates.js';
import {
  findUserById, findUserByEmailGlobal, findUserByIdUnscoped, createUser, setPasswordHash,
  setEmailVerified, recordFailedLogin, resetFailedLogins, setMfaSecret,
  enableMfa, disableMfa, activateIfPending,
} from '../repositories/user.repository.js';
import { assignRoleToUser, findRolesForUser, findRoleByName } from '../repositories/role.repository.js';
import { findOrganizationById } from '../repositories/organization.repository.js';
import {
  createEmailVerificationToken, findValidEmailVerificationToken,
  markEmailVerificationTokenUsed, invalidateOutstandingVerificationTokens,
} from '../repositories/emailVerificationToken.repository.js';
import {
  createPasswordResetToken, findValidPasswordResetToken,
  markPasswordResetTokenUsed, invalidateOutstandingResetTokens,
} from '../repositories/passwordResetToken.repository.js';
import {
  createRefreshToken, findActiveRefreshTokenByRawToken, markRefreshTokenReplaced,
  revokeRefreshTokenFamily, revokeAllRefreshTokensForUser,
} from '../repositories/refreshToken.repository.js';
import {
  replaceRecoveryCodes, findUnusedRecoveryCode, markRecoveryCodeUsed, deleteAllRecoveryCodes,
} from '../repositories/mfaRecoveryCode.repository.js';
import { destroyAllSessionsForUser } from '../config/session.js';
import { audit } from './audit.service.js';
import { logger } from '../config/logger.js';
import { serializeUser } from '../utils/serializers.js';
import { env } from '../config/env.js';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Generic, anti-enumeration message — used for both "no such user" and
// "wrong password" so a caller can't distinguish account existence, and for
// forgot-password/resend-verification regardless of whether the email exists.
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

async function loadRoleNames(userId) {
  const userRoles = await findRolesForUser(userId);
  return userRoles.map((ur) => ur.role.name);
}

// Used by GET /auth/me — the authenticate middleware only attaches
// {id, organizationId, roles} to req.user (the minimum needed for
// authorization decisions on every other route), but the client needs the
// full profile (name, email, MFA status) to render account UI without
// requiring the `users:read` permission most roles don't hold. Org-scoped
// like everything else, even though a self-lookup by definition can't
// cross an organization boundary.
export async function getCurrentUser(userId, organizationId) {
  const user = await findUserById(userId, organizationId);
  if (!user) throw AppError.unauthorized('Your session is no longer valid. Please sign in again.');
  const roles = await loadRoleNames(user.id);
  return serializeUser(user, roles);
}

// ── Registration ────────────────────────────────────────────────────────

// Single-tenant deployment: this is one real estate company's system, not a
// multi-org SaaS product, so registering an account never creates a new
// organization — every new user joins the one organization configured via
// PRIMARY_ORGANIZATION_ID, starting out with the least-privileged `tenant`
// role. An administrator promotes them to a different role afterward from
// the Users module — see role.service.js#setRolePermissionsRecord and the
// role-assignment endpoints for how that works.
export async function registerOrganization({ firstName, lastName, email, password }, req) {
  const existing = await findUserByEmailGlobal(email);
  if (existing) {
    // Same generic shape as any other validation error — does not confirm
    // whether the email is already registered, beyond what's unavoidable
    // for this specific "you typed your own email while registering" case.
    throw AppError.conflict('An account with this email already exists.');
  }

  const organization = await findOrganizationById(env.PRIMARY_ORGANIZATION_ID);
  if (!organization) {
    // Misconfiguration, not a user-facing error — the deployment's
    // PRIMARY_ORGANIZATION_ID env var doesn't point at a real row.
    logger.error({ orgId: env.PRIMARY_ORGANIZATION_ID }, 'PRIMARY_ORGANIZATION_ID does not match any organization');
    throw AppError.internal('Registration is temporarily unavailable. Please try again later.');
  }

  const tenantRole = await findRoleByName(organization.id, 'tenant');
  if (!tenantRole) {
    logger.error({ orgId: organization.id }, 'Primary organization has no "tenant" role to assign at registration');
    throw AppError.internal('Registration is temporarily unavailable. Please try again later.');
  }

  assertPasswordPolicy(password, { email, firstName, lastName });
  const passwordHash = await hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await createUser(
      { organizationId: organization.id, firstName, lastName, email, passwordHash, status: 'pending' },
      tx
    );
    await assignRoleToUser(user.id, tenantRole.id, tx);

    const rawToken = generateRawToken();
    await createEmailVerificationToken(user.id, rawToken, new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS), tx);

    return { user, rawToken };
  }, { timeout: 15_000 });

  await audit({
    organizationId: organization.id,
    userId: result.user.id,
    action: 'user.registered',
    entityType: 'user',
    entityId: result.user.id,
    newValues: { email: result.user.email, role: 'tenant' },
    req,
  });

  const { subject, html, text } = verificationEmail(result.rawToken);
  await sendMail({ to: result.user.email, subject, html, text });

  return { organization, user: serializeUser(result.user) };
}

export async function verifyEmail(rawToken, req) {
  const tokenRow = await findValidEmailVerificationToken(rawToken);
  if (!tokenRow) throw AppError.badRequest('This verification link is invalid or has expired.');

  const user = await findUserByIdUnscoped(tokenRow.userId);
  if (!user) throw AppError.badRequest('This verification link is invalid or has expired.');

  await setEmailVerified(user.id);
  await markEmailVerificationTokenUsed(tokenRow.id);
  await audit({ organizationId: user.organizationId, userId: user.id, action: 'user.email_verified', entityType: 'user', entityId: user.id, req });

  return { verified: true };
}

export async function resendVerificationEmail(email, req) {
  const user = await findUserByEmailGlobal(email);
  if (user && !user.emailVerified) {
    await invalidateOutstandingVerificationTokens(user.id);
    const rawToken = generateRawToken();
    await createEmailVerificationToken(user.id, rawToken, new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS));
    const { subject, html, text } = verificationEmail(rawToken);
    await sendMail({ to: user.email, subject, html, text });
    await audit({ organizationId: user.organizationId, userId: user.id, action: 'user.verification_resent', entityType: 'user', entityId: user.id, req });
  }
  // Always the same response — do not reveal whether the email exists or is
  // already verified.
  return { message: 'If an account with that email exists and is unverified, a new verification link has been sent.' };
}

// ── Login (session-based, browser) ──────────────────────────────────────

export async function login({ email, password }, req) {
  const user = await findUserByEmailGlobal(email);

  if (!user) {
    // Constant-shape failure path — no early return before a password
    // comparison would happen for a real user, to reduce timing signal.
    await verifyPassword('$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', password);
    throw AppError.unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw AppError.forbidden('This account is temporarily locked due to repeated failed sign-in attempts. Please try again later.');
  }

  const passwordValid = await verifyPassword(user.passwordHash, password);
  if (!passwordValid) {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;
    await recordFailedLogin(user.id, { lock: shouldLock, lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : undefined });
    await audit({ organizationId: user.organizationId, userId: user.id, action: 'auth.login_failed', entityType: 'user', entityId: user.id, req });
    throw AppError.unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }

  if (user.status === 'pending') {
    throw AppError.forbidden('Please verify your email address before signing in.');
  }
  if (user.status === 'inactive' || user.status === 'locked') {
    throw AppError.forbidden('This account is not active. Please contact your administrator.');
  }

  if (user.mfaEnabled) {
    return { mfaRequired: true, mfaToken: signMfaChallengeToken(user.id) };
  }

  await resetFailedLogins(user.id);
  await establishSession(req, user);
  const roles = await loadRoleNames(user.id);
  await audit({ organizationId: user.organizationId, userId: user.id, action: 'auth.login_succeeded', entityType: 'user', entityId: user.id, req });

  return { user: serializeUser(user, roles) };
}

export async function completeMfaChallenge({ mfaToken, code }, req) {
  const payload = verifyMfaChallengeToken(mfaToken);

  const user = await findUserByIdUnscoped(payload.sub);
  if (!user || !user.mfaEnabled || !user.mfaSecretEncrypted) throw AppError.unauthorized('Invalid MFA challenge.');

  const isTotpValid = verifyTotpCode(user.mfaSecretEncrypted, code);
  let usedRecoveryCode = null;
  if (!isTotpValid) {
    const recoveryHash = hashRecoveryCode(code ?? '');
    usedRecoveryCode = await findUnusedRecoveryCode(user.id, recoveryHash);
    if (!usedRecoveryCode) {
      await audit({ organizationId: user.organizationId, userId: user.id, action: 'auth.mfa_failed', entityType: 'user', entityId: user.id, req });
      throw AppError.unauthorized('Invalid authentication code.');
    }
  }
  if (usedRecoveryCode) await markRecoveryCodeUsed(usedRecoveryCode.id);

  await resetFailedLogins(user.id);
  await establishSession(req, user);
  const roles = await loadRoleNames(user.id);
  await audit({ organizationId: user.organizationId, userId: user.id, action: 'auth.mfa_succeeded', entityType: 'user', entityId: user.id, req });

  return { user: serializeUser(user, roles), usedRecoveryCode: Boolean(usedRecoveryCode) };
}

// Regenerates the session ID before writing principal data — prevents
// session fixation (an attacker who fixed a pre-login session ID gains
// nothing, since the ID changes the moment auth succeeds).
function establishSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user.id;
      req.session.organizationId = user.organizationId;
      req.session.loginAt = Date.now();
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

export function logout(req) {
  return new Promise((resolve, reject) => {
    const { userId, organizationId } = req.session;
    req.session.destroy((err) => {
      if (err) return reject(err);
      if (userId) {
        audit({ organizationId, userId, action: 'auth.logout', entityType: 'user', entityId: userId, req }).catch((e) =>
          logger.error({ err: e }, 'audit logging failed for logout')
        );
      }
      resolve();
    });
  });
}

export async function logoutAllSessions(userId, organizationId, req) {
  await destroyAllSessionsForUser(userId);
  await revokeAllRefreshTokensForUser(userId);
  await audit({ organizationId, userId, action: 'auth.logout_all', entityType: 'user', entityId: userId, req });
}

// ── Password management ──────────────────────────────────────────────────

export async function changePassword(userId, organizationId, { currentPassword, newPassword }, req) {
  const user = await findUserByIdUnscoped(userId);
  if (!user) throw AppError.notFound();

  // "Recent authentication" for a sensitive operation — re-verify the
  // current password within this same request rather than trusting session
  // age alone.
  const isValid = await verifyPassword(user.passwordHash, currentPassword);
  if (!isValid) throw AppError.unauthorized('Current password is incorrect.');

  assertPasswordPolicy(newPassword, { email: user.email, firstName: user.firstName, lastName: user.lastName });
  const passwordHash = await hashPassword(newPassword);
  await setPasswordHash(user.id, passwordHash);

  // Changing a password invalidates every other standing credential —
  // otherwise a stolen session/refresh token survives the very action meant
  // to shut an attacker out.
  await destroyAllSessionsForUser(user.id, req.sessionID);
  await revokeAllRefreshTokensForUser(user.id);
  await establishSession(req, user);

  await audit({ organizationId, userId: user.id, action: 'user.password_changed', entityType: 'user', entityId: user.id, req });
  return { changed: true };
}

export async function forgotPassword(email, req) {
  const user = await findUserByEmailGlobal(email);
  if (user && user.status !== 'inactive') {
    await invalidateOutstandingResetTokens(user.id);
    const rawToken = generateRawToken();
    await createPasswordResetToken(user.id, rawToken, new Date(Date.now() + PASSWORD_RESET_TTL_MS));
    const { subject, html, text } = passwordResetEmail(rawToken);
    await sendMail({ to: user.email, subject, html, text });
    await audit({ organizationId: user.organizationId, userId: user.id, action: 'user.password_reset_requested', entityType: 'user', entityId: user.id, req });
  }
  return { message: 'If an account with that email exists, a password reset link has been sent.' };
}

export async function resetPassword({ token, newPassword }, req) {
  const tokenRow = await findValidPasswordResetToken(token);
  if (!tokenRow) throw AppError.badRequest('This password reset link is invalid or has expired.');

  const user = await findUserByIdUnscoped(tokenRow.userId);
  if (!user) throw AppError.badRequest('This password reset link is invalid or has expired.');

  assertPasswordPolicy(newPassword, { email: user.email, firstName: user.firstName, lastName: user.lastName });
  const passwordHash = await hashPassword(newPassword);
  await setPasswordHash(user.id, passwordHash);
  // Completes an invite: a pending account that successfully consumes its
  // emailed token and sets a password is thereby proven to own that email
  // address. No-op for an ordinary already-active reset; never reactivates
  // an admin-deactivated account (see repository for the WHERE-guard detail).
  await activateIfPending(user.id);
  await markPasswordResetTokenUsed(tokenRow.id);
  await invalidateOutstandingResetTokens(user.id);
  await destroyAllSessionsForUser(user.id);
  await revokeAllRefreshTokensForUser(user.id);

  await audit({ organizationId: user.organizationId, userId: user.id, action: 'user.password_reset_completed', entityType: 'user', entityId: user.id, req });
  return { reset: true };
}

// ── MFA ───────────────────────────────────────────────────────────────────

export async function enrollMfa(userId, organizationId, req) {
  const user = await findUserByIdUnscoped(userId);
  if (!user) throw AppError.notFound();
  if (user.mfaEnabled) throw AppError.conflict('MFA is already enabled on this account.');

  const secret = generateTotpSecret();
  await setMfaSecret(user.id, encryptTotpSecret(secret));
  await audit({ organizationId, userId: user.id, action: 'user.mfa_enrollment_started', entityType: 'user', entityId: user.id, req });

  return { secret, otpAuthUrl: buildOtpAuthUrl(secret, user.email) };
}

export async function confirmMfaEnrollment(userId, organizationId, code, req) {
  const user = await findUserByIdUnscoped(userId);
  if (!user?.mfaSecretEncrypted) throw AppError.badRequest('No pending MFA enrollment found. Start enrollment first.');

  if (!verifyTotpCode(user.mfaSecretEncrypted, code)) {
    throw AppError.badRequest('Invalid authentication code. Please try again.');
  }

  await enableMfa(user.id);
  const recoveryCodes = generateRecoveryCodes();
  await replaceRecoveryCodes(user.id, recoveryCodes.map(hashRecoveryCode));

  await audit({ organizationId, userId: user.id, action: 'user.mfa_enabled', entityType: 'user', entityId: user.id, req });
  return { enabled: true, recoveryCodes };
}

export async function disableMfaForUser(userId, organizationId, { password, code }, req) {
  const user = await findUserByIdUnscoped(userId);
  if (!user) throw AppError.notFound();
  if (!user.mfaEnabled) throw AppError.conflict('MFA is not enabled on this account.');

  const passwordValid = await verifyPassword(user.passwordHash, password);
  if (!passwordValid) throw AppError.unauthorized('Current password is incorrect.');
  if (!verifyTotpCode(user.mfaSecretEncrypted, code)) throw AppError.badRequest('Invalid authentication code.');

  await disableMfa(user.id);
  await deleteAllRecoveryCodes(user.id);

  await audit({ organizationId, userId: user.id, action: 'user.mfa_disabled', entityType: 'user', entityId: user.id, req });
  return { disabled: true };
}

// ── JWT (mobile / external API clients) ──────────────────────────────────

export async function issueTokenPair(user, req) {
  const roles = await loadRoleNames(user.id);
  const accessToken = signAccessToken({ userId: user.id, organizationId: user.organizationId, roles });

  const familyId = randomUUID();
  const rawRefreshToken = signRefreshToken({ userId: user.id, familyId });
  await createRefreshToken({
    userId: user.id,
    rawToken: rawRefreshToken,
    familyId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    ipAddress: req?.ip,
    userAgent: req?.headers?.['user-agent'],
  });

  return { accessToken, refreshToken: rawRefreshToken };
}

export async function loginForToken({ email, password }, req) {
  const user = await findUserByEmailGlobal(email);
  if (!user) throw AppError.unauthorized(INVALID_CREDENTIALS_MESSAGE);

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw AppError.forbidden('This account is temporarily locked due to repeated failed sign-in attempts.');
  }

  const passwordValid = await verifyPassword(user.passwordHash, password);
  if (!passwordValid) {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;
    await recordFailedLogin(user.id, { lock: shouldLock, lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : undefined });
    throw AppError.unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }
  if (user.status !== 'active') throw AppError.forbidden('This account is not active.');

  if (user.mfaEnabled && !req.body.mfaCode) {
    return { mfaRequired: true };
  }
  if (user.mfaEnabled && !verifyTotpCode(user.mfaSecretEncrypted, req.body.mfaCode)) {
    throw AppError.unauthorized('Invalid authentication code.');
  }

  await resetFailedLogins(user.id);
  const tokens = await issueTokenPair(user, req);
  await audit({ organizationId: user.organizationId, userId: user.id, action: 'auth.token_issued', entityType: 'user', entityId: user.id, req });

  const roles = await loadRoleNames(user.id);
  return { ...tokens, user: serializeUser(user, roles) };
}

// Rotation with reuse detection: every refresh consumes the presented token
// and issues a new one in the same family. If a token is presented again
// after already being rotated, that's a signal it was stolen and replayed —
// the entire family is revoked, forcing re-authentication everywhere.
export async function refreshTokenPair(rawRefreshToken, req) {
  const payload = verifyRefreshToken(rawRefreshToken);
  const stored = await findActiveRefreshTokenByRawToken(rawRefreshToken);

  if (!stored) throw AppError.unauthorized('Invalid refresh token.');
  if (stored.revokedAt) {
    await revokeRefreshTokenFamily(stored.familyId);
    logger.warn({ userId: stored.userId, familyId: stored.familyId }, 'refresh token reuse detected — family revoked');
    throw AppError.unauthorized('This session has been revoked. Please sign in again.');
  }
  if (stored.expiresAt < new Date()) throw AppError.unauthorized('Refresh token has expired.');

  const user = await findUserByIdUnscoped(payload.sub);
  if (!user || user.status !== 'active') throw AppError.unauthorized('Invalid refresh token.');

  const roles = await loadRoleNames(user.id);
  const accessToken = signAccessToken({ userId: user.id, organizationId: user.organizationId, roles });
  const newRawRefreshToken = signRefreshToken({ userId: user.id, familyId: stored.familyId });

  const newStored = await createRefreshToken({
    userId: user.id,
    rawToken: newRawRefreshToken,
    familyId: stored.familyId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    ipAddress: req?.ip,
    userAgent: req?.headers?.['user-agent'],
  });
  await markRefreshTokenReplaced(stored.id, newStored.id);

  return { accessToken, refreshToken: newRawRefreshToken };
}

export async function revokeRefreshToken(rawRefreshToken) {
  const stored = await findActiveRefreshTokenByRawToken(rawRefreshToken);
  if (stored) await revokeRefreshTokenFamily(stored.familyId);
  return { revoked: true };
}
