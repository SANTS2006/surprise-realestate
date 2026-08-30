import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../auth/jwt.js';
import { findUserByIdUnscoped } from '../repositories/user.repository.js';
import { findRolesForUser } from '../repositories/role.repository.js';

const ABSOLUTE_TIMEOUT_MS = env.SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1000;

async function loadRoleNames(userId) {
  const userRoles = await findRolesForUser(userId);
  return userRoles.map((ur) => ur.role.name);
}

// Populates req.user = { id, organizationId, roles, authMethod } from
// whichever credential is present — a session cookie (browser) or a
// `Authorization: Bearer` JWT (mobile/external API). See
// docs/security/authentication.md for which clients use which. Re-fetches
// the user's live status/roles from the database on every request rather
// than trusting stale session/token data, so a deactivated account or a
// role change take effect immediately rather than only after the session or
// access token expires.
export const authenticate = asyncHandler(async (req, res, next) => {
  if (req.session?.userId) {
    if (Date.now() - (req.session.loginAt ?? 0) > ABSOLUTE_TIMEOUT_MS) {
      return req.session.destroy(() => next(AppError.unauthorized('Your session has expired. Please sign in again.')));
    }

    const user = await findUserByIdUnscoped(req.session.userId);
    if (!user || user.status !== 'active' || user.organizationId !== req.session.organizationId) {
      return req.session.destroy(() => next(AppError.unauthorized('Your session is no longer valid. Please sign in again.')));
    }

    req.user = { id: user.id, organizationId: user.organizationId, roles: await loadRoleNames(user.id), authMethod: 'session' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const payload = verifyAccessToken(authHeader.slice('Bearer '.length));
    const user = await findUserByIdUnscoped(payload.sub);
    if (!user || user.status !== 'active' || user.organizationId !== payload.org) {
      throw AppError.unauthorized('This access token is no longer valid.');
    }
    req.user = { id: user.id, organizationId: user.organizationId, roles: payload.roles ?? [], authMethod: 'jwt' };
    return next();
  }

  throw AppError.unauthorized();
});

// Lightweight variant for endpoints (like GET /auth/me) that should behave
// differently for anonymous vs authenticated callers without hard-failing —
// still re-validates, just doesn't throw when nothing is presented.
export const authenticateOptional = asyncHandler(async (req, res, next) => {
  if (!req.session?.userId && !req.headers.authorization) return next();
  return authenticate(req, res, next);
});
