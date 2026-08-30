import { prisma } from '../config/database.js';

export function createOwner(data) {
  return prisma.owner.create({ data });
}

export function findOwnerById(id, organizationId) {
  return prisma.owner.findFirst({ where: { id, organizationId } });
}

export function findOwnerByUserId(userId, organizationId) {
  return prisma.owner.findFirst({ where: { userId, organizationId } });
}

function buildOwnerListWhere(organizationId, { search, status }) {
  return {
    organizationId,
    ...(status ? { status } : {}),
    ...(search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
      : {}),
  };
}

export function findOwnersByOrganization(organizationId, { skip, take, search, status }) {
  return prisma.owner.findMany({ where: buildOwnerListWhere(organizationId, { search, status }), orderBy: { name: 'asc' }, skip, take });
}

export function countOwnersByOrganization(organizationId, { search, status }) {
  return prisma.owner.count({ where: buildOwnerListWhere(organizationId, { search, status }) });
}

const UPDATABLE_OWNER_FIELDS = ['name', 'email', 'phone', 'address'];

export function updateOwner(id, organizationId, data) {
  const update = {};
  for (const field of UPDATABLE_OWNER_FIELDS) {
    if (data[field] !== undefined) update[field] = data[field];
  }
  return prisma.owner.updateMany({ where: { id, organizationId }, data: update });
}

export function setOwnerStatus(id, organizationId, status) {
  return prisma.owner.updateMany({ where: { id, organizationId }, data: { status } });
}

export function linkOwnerUser(id, organizationId, userId) {
  return prisma.owner.updateMany({ where: { id, organizationId }, data: { userId } });
}
