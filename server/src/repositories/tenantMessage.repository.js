import { prisma } from '../config/database.js';

export function createTenantMessage(data) {
  return prisma.tenantMessage.create({ data });
}

export function findTenantMessagesForRecipient(recipientId, organizationId, { skip, take }) {
  return prisma.tenantMessage.findMany({
    where: { recipientId, organizationId },
    include: {
      tenant: { select: { id: true, firstName: true, lastName: true } },
      property: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });
}

export function countTenantMessagesForRecipient(recipientId, organizationId) {
  return prisma.tenantMessage.count({ where: { recipientId, organizationId } });
}

// Admin org-wide feed — every tenant message, regardless of recipient, with
// both the sender and recipient attached. Query-mode, not row duplication;
// gated in tenantMessage.service.js#listInbox on the administrator role.
export function findTenantMessagesForOrganization(organizationId, { skip, take }) {
  return prisma.tenantMessage.findMany({
    where: { organizationId },
    include: {
      tenant: { select: { id: true, firstName: true, lastName: true } },
      recipient: { select: { id: true, firstName: true, lastName: true } },
      property: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });
}

export function countTenantMessagesForOrganization(organizationId) {
  return prisma.tenantMessage.count({ where: { organizationId } });
}
