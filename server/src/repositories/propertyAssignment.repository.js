import { prisma } from '../config/database.js';

export async function isUserAssignedToProperty(propertyId, userId) {
  const row = await prisma.propertyAssignment.findUnique({
    where: { propertyId_userId: { propertyId, userId } },
  });
  return Boolean(row);
}

export function findAssignmentsForProperty(propertyId, organizationId) {
  return prisma.propertyAssignment.findMany({
    where: { propertyId, organizationId },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
}

export function assignUserToProperty(propertyId, userId, organizationId) {
  return prisma.propertyAssignment.upsert({
    where: { propertyId_userId: { propertyId, userId } },
    update: {},
    create: { propertyId, userId, organizationId },
  });
}

export function unassignUserFromProperty(propertyId, userId, organizationId) {
  return prisma.propertyAssignment.deleteMany({ where: { propertyId, userId, organizationId } });
}

// Every property a given user is assigned to, within their organization —
// used to scope a property_manager/agent's list view (see
// property.service.js#listProperties).
export function findPropertyIdsAssignedToUser(userId, organizationId) {
  return prisma.propertyAssignment.findMany({
    where: { userId, organizationId },
    select: { propertyId: true },
  });
}
