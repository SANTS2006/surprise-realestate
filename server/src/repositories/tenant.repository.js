import { prisma } from '../config/database.js';

export function createTenant(data) {
  return prisma.tenant.create({ data });
}

export function findTenantById(id, organizationId) {
  return prisma.tenant.findFirst({ where: { id, organizationId } });
}

export function findTenantByUserId(userId, organizationId) {
  return prisma.tenant.findFirst({ where: { userId, organizationId } });
}

function buildTenantListWhere(organizationId, { search, status, unitId, buildingId }) {
  return {
    organizationId,
    ...(status ? { status } : {}),
    ...(unitId ? { unitId } : {}),
    ...(buildingId ? { buildingId } : {}),
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

export function findTenantsByOrganization(organizationId, { skip, take, search, status, unitId, buildingId }) {
  return prisma.tenant.findMany({ where: buildTenantListWhere(organizationId, { search, status, unitId, buildingId }), orderBy: { lastName: 'asc' }, skip, take });
}

export function countTenantsByOrganization(organizationId, { search, status, unitId, buildingId }) {
  return prisma.tenant.count({ where: buildTenantListWhere(organizationId, { search, status, unitId, buildingId }) });
}

// Single-tenant lookup for "who lives here" scenarios (e.g. auto-loading
// the resident to notify when scheduling an inspection) — a unit is
// expected to have at most one current tenant, so this returns the first
// match rather than a list.
export function findTenantByUnitId(unitId, organizationId) {
  return prisma.tenant.findFirst({ where: { organizationId, unitId } });
}

const UPDATABLE_TENANT_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'emergencyContact', 'buildingId', 'unitId'];

export function updateTenant(id, organizationId, data) {
  const update = {};
  for (const field of UPDATABLE_TENANT_FIELDS) {
    if (data[field] !== undefined) update[field] = data[field];
  }
  return prisma.tenant.updateMany({ where: { id, organizationId }, data: update });
}

export function setTenantStatus(id, organizationId, status) {
  return prisma.tenant.updateMany({ where: { id, organizationId }, data: { status } });
}

export function linkTenantUser(id, organizationId, userId) {
  return prisma.tenant.updateMany({ where: { id, organizationId }, data: { userId } });
}
