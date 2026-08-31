import { AppError } from '../utils/AppError.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import {
  createTenantMessage, findTenantMessagesForRecipient, countTenantMessagesForRecipient,
  findTenantMessagesForOrganization, countTenantMessagesForOrganization,
} from '../repositories/tenantMessage.repository.js';
import { findTenantByUserId, findPropertyIdForTenant } from '../repositories/tenant.repository.js';
import { findAgentAssignmentsForProperty } from '../repositories/propertyAssignment.repository.js';
import { findPropertyById } from '../repositories/property.repository.js';
import { notify } from './notification.service.js';

function serializeMessage(message) {
  return {
    id: message.id,
    content: message.content,
    readAt: message.readAt,
    createdAt: message.createdAt,
    ...(message.tenant ? { tenant: { id: message.tenant.id, firstName: message.tenant.firstName, lastName: message.tenant.lastName } } : {}),
    ...(message.recipient ? { recipient: { id: message.recipient.id, firstName: message.recipient.firstName, lastName: message.recipient.lastName } } : {}),
    ...(message.property ? { property: { id: message.property.id, name: message.property.name } } : {}),
  };
}

// One tenant compose action can reach more than one agent (a property can
// have multiple assigned agents) — a TenantMessage row is created per
// recipient so each agent's inbox query stays a simple recipientId filter,
// and each gets their own in-app notification + email.
export async function sendTenantMessage(actingUser, content) {
  const tenant = await findTenantByUserId(actingUser.id, actingUser.organizationId);
  if (!tenant) throw AppError.badRequest('No tenant record is linked to your account. Contact an administrator.');

  const propertyId = await findPropertyIdForTenant(tenant.id, actingUser.organizationId);
  if (!propertyId) throw AppError.badRequest('You are not currently linked to a property. Contact an administrator.');

  const assignments = await findAgentAssignmentsForProperty(propertyId, actingUser.organizationId);
  if (assignments.length === 0) throw AppError.badRequest('No property manager is currently assigned to your property. Contact an administrator.');

  const property = await findPropertyById(propertyId, actingUser.organizationId);
  const tenantName = `${tenant.firstName} ${tenant.lastName}`;

  await Promise.all(assignments.map((assignment) =>
    createTenantMessage({ organizationId: actingUser.organizationId, tenantId: tenant.id, recipientId: assignment.userId, propertyId, content })
  ));

  for (const assignment of assignments) {
    await notify({
      organizationId: actingUser.organizationId, userId: assignment.userId, type: 'tenant_message',
      title: `New message from ${tenantName}`, message: `${property?.name ? `[${property.name}] ` : ''}${content}`,
    });
  }

  return { sent: assignments.length };
}

export async function listInbox(organizationId, actingUser, { page, pageSize, skip, take }) {
  if (actingUser.roles.includes('administrator')) {
    const [messages, total] = await Promise.all([
      findTenantMessagesForOrganization(organizationId, { skip, take }),
      countTenantMessagesForOrganization(organizationId),
    ]);
    return { messages: messages.map(serializeMessage), meta: buildPaginationMeta({ page, pageSize, total }) };
  }

  const [messages, total] = await Promise.all([
    findTenantMessagesForRecipient(actingUser.id, organizationId, { skip, take }),
    countTenantMessagesForRecipient(actingUser.id, organizationId),
  ]);
  return { messages: messages.map(serializeMessage), meta: buildPaginationMeta({ page, pageSize, total }) };
}
