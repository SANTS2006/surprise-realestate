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
