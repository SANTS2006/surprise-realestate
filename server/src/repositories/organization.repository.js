import { prisma } from '../config/database.js';

// Organizations are the tenant root — there is no parent scope to filter by.
export function findOrganizationById(id) {
  return prisma.organization.findUnique({ where: { id } });
}

export function createOrganization(data, tx = prisma) {
  return tx.organization.create({ data });
}

// Explicit allow-list of updatable fields, applied by the caller
// (organization.service.js) — never a raw `data: req.body` spread, which
// would let a client smuggle `status` or other fields not meant to be
// client-settable straight into the update.
export function updateOrganization(id, data) {
  return prisma.organization.update({ where: { id }, data });
}

// Resolves the tenant for a path-based URL namespace (e.g. /acme-realty/login)
// — the one place a slug becomes an organizationId. Case-sensitive by
// design: slugs are normalized to lowercase at creation (see
// utils/slug.js), so a mismatch here just means "no such tenant."
export function findOrganizationBySlug(slug) {
  return prisma.organization.findUnique({ where: { slug } });
}

export function findOrganizationBySlugExcludingId(slug, excludeId) {
  return prisma.organization.findFirst({ where: { slug, id: { not: excludeId } } });
}

// Platform-admin only — every tenant, unfiltered. Never call this from a
// tenant-scoped code path.
export function findAllOrganizations() {
  return prisma.organization.findMany({ orderBy: { createdAt: 'desc' } });
}

export function updateOrganizationStatus(id, status) {
  return prisma.organization.update({ where: { id }, data: { status } });
}
