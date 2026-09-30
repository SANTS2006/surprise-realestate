import { prisma } from '../config/database.js';

// PlatformAdmin has no organizationId — it is deliberately outside the
// tenant-scoping convention used everywhere else in repositories/. Every
// query here is platform-wide by construction.

export function findPlatformAdminByEmail(email) {
  return prisma.platformAdmin.findUnique({ where: { email: email.toLowerCase() } });
}

export function findPlatformAdminById(id) {
  return prisma.platformAdmin.findUnique({ where: { id } });
}

export function createPlatformAdmin(data) {
  return prisma.platformAdmin.create({ data: { ...data, email: data.email.toLowerCase() } });
}

export function recordPlatformAdminFailedLogin(id, { lock, lockedUntil }) {
  return prisma.platformAdmin.update({
    where: { id },
    data: {
      failedLoginAttempts: { increment: 1 },
      ...(lock ? { lockedUntil } : {}),
    },
  });
}

export function resetPlatformAdminFailedLogins(id) {
  return prisma.platformAdmin.update({
    where: { id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
}
