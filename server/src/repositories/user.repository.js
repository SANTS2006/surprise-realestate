import { prisma } from '../config/database.js';

// Users are organization-owned; every lookup that isn't explicitly a
// platform-wide login/uniqueness check takes organizationId. See
// docs/security/authorization.md §4 — this is the convention every
// repository in this codebase follows.

export function findUserById(id, organizationId) {
  return prisma.user.findFirst({ where: { id, organizationId } });
}

// Login and registration-uniqueness need to resolve a user by email without
// already knowing their organization (the login form only collects
// email+password — no org selector). The DB's uniqueness constraint is
// (organizationId, email) to allow the same person to hold separate
// accounts in different organizations later (e.g. an owner invited into two
// portfolios), but for now registration additionally enforces global email
// uniqueness (see auth.service.js) so login-by-email-alone stays unambiguous.
// Used to fan out an org-wide notification (e.g. a new audit remark) to
// every user holding a given role, without the caller needing to know
// anything about the role/permission tables itself.
export function findUserIdsByRole(organizationId, roleName) {
  return prisma.user.findMany({
    where: { organizationId, userRoles: { some: { role: { name: roleName } } } },
    select: { id: true },
  });
}

export function findUserByEmailGlobal(email) {
  return prisma.user.findFirst({ where: { email: email.toLowerCase() } });
}

export function findUserByEmailInOrg(email, organizationId) {
  return prisma.user.findFirst({ where: { email: email.toLowerCase(), organizationId } });
}

export function findUserWithRoles(id, organizationId) {
  return prisma.user.findFirst({
    where: { id, organizationId },
    include: { userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } },
  });
}

export function createUser(data, tx = prisma) {
  return tx.user.create({ data: { ...data, email: data.email.toLowerCase() } });
}

export function updateUser(id, organizationId, data) {
  return prisma.user.updateMany({ where: { id, organizationId }, data });
}

function buildUserListWhere(organizationId, { search, status }) {
  return {
    organizationId,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

export function findUsersByOrganization(organizationId, { skip, take, search, status }) {
  return prisma.user.findMany({
    where: buildUserListWhere(organizationId, { search, status }),
    include: { userRoles: { include: { role: true } } },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });
}

export function countUsersByOrganization(organizationId, { search, status }) {
  return prisma.user.count({ where: buildUserListWhere(organizationId, { search, status }) });
}

// Deliberately takes the raw id with no organizationId filter — used only by
// authentication middleware immediately after verifying a session/JWT
// subject, where the organizationId isn't known yet (it comes FROM this
// row). Every other repository function in the codebase must not follow
// this pattern.
export function findUserByIdUnscoped(id) {
  return prisma.user.findUnique({ where: { id } });
}

export function recordFailedLogin(id, { lock, lockedUntil }) {
  return prisma.user.update({
    where: { id },
    data: {
      failedLoginAttempts: lock ? 0 : { increment: 1 },
      ...(lockedUntil ? { lockedUntil } : {}),
    },
  });
}

export function resetFailedLogins(id) {
  return prisma.user.update({
    where: { id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
}

export function setPasswordHash(id, passwordHash) {
  return prisma.user.update({ where: { id }, data: { passwordHash } });
}

// Used by the reset-password flow, which doubles as "complete invite" for a
// user who was created with a random, never-transmitted password (see
// user.service.js#inviteUser). Successfully consuming the emailed token and
// setting a real password is itself proof of owning the invited email
// address, so a *pending* account is also activated here — there's no
// separate email-verification step for invited users to otherwise get stuck
// behind. The `status: 'pending'` guard in the WHERE clause is deliberate:
// this must never reactivate an account an admin has deactivated
// (`inactive`/`locked`) just because that user still knows/resets their
// password — updateMany simply matches zero rows in that case, which is the
// correct outcome, not an error.
export function activateIfPending(id) {
  return prisma.user.updateMany({ where: { id, status: 'pending' }, data: { status: 'active', emailVerified: true } });
}

export function setEmailVerified(id) {
  return prisma.user.update({ where: { id }, data: { emailVerified: true, status: 'active' } });
}

export function setMfaSecret(id, mfaSecretEncrypted) {
  return prisma.user.update({ where: { id }, data: { mfaSecretEncrypted } });
}

export function enableMfa(id) {
  return prisma.user.update({ where: { id }, data: { mfaEnabled: true } });
}

export function disableMfa(id) {
  return prisma.user.update({ where: { id }, data: { mfaEnabled: false, mfaSecretEncrypted: null } });
}

// Explicit allow-list of the one field this touches — never a generic
// "update with whatever the caller sent" (mass-assignment protection).
export function setUserStatus(id, organizationId, status) {
  return prisma.user.updateMany({ where: { id, organizationId }, data: { status } });
}
