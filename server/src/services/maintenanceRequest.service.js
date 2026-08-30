import { AppError } from '../utils/AppError.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import {
  createMaintenanceRequest, findMaintenanceRequestById, findMaintenanceRequestsByOrganization,
  countMaintenanceRequestsByOrganization, updateMaintenanceRequestStatus, assignMaintenanceRequest,
} from '../repositories/maintenanceRequest.repository.js';
import { findPropertyById } from '../repositories/property.repository.js';
import { findUnitById } from '../repositories/unit.repository.js';
import { findTenantById, findTenantByUserId } from '../repositories/tenant.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { assertPropertyAccess, getRestrictedScope } from './resourceAccess.service.js';
import { getCoverImageUrls } from './document.service.js';
import { audit } from './audit.service.js';
import { notify } from './notification.service.js';

const CANCELLABLE_STATUSES = new Set(['open', 'in_review', 'assigned', 'scheduled']);

function serializeMaintenanceRequest(request) {
  return {
    id: request.id,
    propertyId: request.propertyId,
    unitId: request.unitId,
    tenantId: request.tenantId,
    title: request.title,
    description: request.description,
    priority: request.priority,
    status: request.status,
    assignedTo: request.assignedTo,
    reportedAt: request.reportedAt,
    resolvedAt: request.resolvedAt,
  };
}

async function loadMaintenanceRequestWithAccess(id, organizationId, actingUser) {
  const request = await findMaintenanceRequestById(id, organizationId);
  if (!request) throw AppError.notFound('Maintenance request not found.');

  if (actingUser.roles.includes('tenant')) {
    const scope = await getRestrictedScope(actingUser, organizationId);
    if (scope.tenantId !== request.tenantId) throw AppError.notFound('Maintenance request not found.');
    return request;
  }
  await assertPropertyAccess(request.property, actingUser);
  return request;
}

export async function listMaintenanceRequests(organizationId, actingUser, { page, pageSize, skip, take, status, priority, propertyId, tenantId }) {
  const scope = await getRestrictedScope(actingUser, organizationId);
  const effectiveTenantId = scope.tenantId ?? tenantId;
  const propertyIds = scope.propertyIds;

  const [requests, total] = await Promise.all([
    findMaintenanceRequestsByOrganization(organizationId, { skip, take, status, priority, propertyId, tenantId: effectiveTenantId, propertyIds }),
    countMaintenanceRequestsByOrganization(organizationId, { status, priority, propertyId, tenantId: effectiveTenantId, propertyIds }),
  ]);
  const coverUrls = await getCoverImageUrls(organizationId, 'maintenance_request', requests.map((r) => r.id));
  return {
    requests: requests.map((r) => ({ ...serializeMaintenanceRequest(r), coverImageUrl: coverUrls.get(r.id) ?? null })),
    meta: buildPaginationMeta({ page, pageSize, total }),
  };
}

export async function getMaintenanceRequest(id, organizationId, actingUser) {
  const request = await loadMaintenanceRequestWithAccess(id, organizationId, actingUser);
  return serializeMaintenanceRequest(request);
}

// A tenant reporting an issue is always scoped to themself and to a unit
// they actually have (or had) a lease on — they can't file a request
// against an arbitrary unit just by knowing its id. Staff (property_manager/
// maintenance_manager/administrator) instead specify the property directly
// and may optionally attach a unit/tenant.
export async function createMaintenanceRequestRecord(organizationId, body, actingUser, req) {
  let propertyId = body.propertyId;
  let tenantId = body.tenantId ?? null;
  const unitId = body.unitId ?? null;

  if (actingUser.roles.includes('tenant')) {
    const tenant = await findTenantByUserId(actingUser.id, organizationId);
    if (!tenant) throw AppError.forbidden('No tenant profile is associated with your account.');
    if (!unitId) throw AppError.badRequest('unitId is required.');

    const unit = await findUnitById(unitId, organizationId);
    if (!unit) throw AppError.badRequest('The specified unit does not exist in this organization.');

    tenantId = tenant.id;
    propertyId = unit.building.propertyId;
  } else {
    if (!propertyId) throw AppError.badRequest('propertyId is required.');
    const property = await findPropertyById(propertyId, organizationId);
    if (!property) throw AppError.badRequest('The specified property does not exist in this organization.');
    await assertPropertyAccess(property, actingUser);

    if (unitId) {
      const unit = await findUnitById(unitId, organizationId);
      if (!unit || unit.building.propertyId !== propertyId) throw AppError.badRequest('The specified unit does not belong to this property.');
    }
    if (tenantId) {
      const tenant = await findTenantById(tenantId, organizationId);
      if (!tenant) throw AppError.badRequest('The specified tenant does not exist in this organization.');
    }
  }

  const request = await createMaintenanceRequest({
    organizationId,
    propertyId,
    unitId,
    tenantId,
    title: body.title,
    description: body.description ?? null,
    priority: body.priority ?? 'medium',
    status: 'open',
  });

  await audit({ organizationId, userId: actingUser.id, action: 'maintenance_request.created', entityType: 'maintenance_request', entityId: request.id, newValues: { title: request.title, priority: request.priority }, req });
  return getMaintenanceRequest(request.id, organizationId, actingUser);
}

export async function reviewMaintenanceRequest(id, organizationId, actingUser, req) {
  const request = await loadMaintenanceRequestWithAccess(id, organizationId, actingUser);
  if (request.status !== 'open') throw AppError.conflict(`Only an open request can be moved to review (current status: ${request.status}).`);

  await updateMaintenanceRequestStatus(id, 'in_review');
  await audit({ organizationId, userId: actingUser.id, action: 'maintenance_request.reviewed', entityType: 'maintenance_request', entityId: id, newValues: { status: 'in_review' }, req });
  return getMaintenanceRequest(id, organizationId, actingUser);
}

export async function assignMaintenanceRequestRecord(id, organizationId, assignedToUserId, actingUser, req) {
  const request = await loadMaintenanceRequestWithAccess(id, organizationId, actingUser);
  if (!['open', 'in_review'].includes(request.status)) {
    throw AppError.conflict(`Cannot assign a request with status "${request.status}".`);
  }

  const assignee = await findUserById(assignedToUserId, organizationId);
  if (!assignee) throw AppError.badRequest('The specified user does not exist in this organization.');

  await assignMaintenanceRequest(id, assignedToUserId);
  await audit({ organizationId, userId: actingUser.id, action: 'maintenance_request.assigned', entityType: 'maintenance_request', entityId: id, newValues: { assignedTo: assignedToUserId }, req });
  await notify({
    organizationId, userId: assignedToUserId, type: 'maintenance_assigned',
    title: 'Maintenance request assigned to you', message: `"${request.title}" has been assigned to you.`,
  });
  return getMaintenanceRequest(id, organizationId, actingUser);
}

export async function cancelMaintenanceRequest(id, organizationId, actingUser, req) {
  const request = await loadMaintenanceRequestWithAccess(id, organizationId, actingUser);
  if (!CANCELLABLE_STATUSES.has(request.status)) {
    throw AppError.conflict(`Cannot cancel a request with status "${request.status}".`);
  }

  await updateMaintenanceRequestStatus(id, 'cancelled');
  await audit({ organizationId, userId: actingUser.id, action: 'maintenance_request.cancelled', entityType: 'maintenance_request', entityId: id, oldValues: { status: request.status }, newValues: { status: 'cancelled' }, req });
  return getMaintenanceRequest(id, organizationId, actingUser);
}

// Used by work-order.service.js to cascade status as work actually
// progresses — a maintenance request's status should always reflect the
// real-world state of the work being done on it, not be edited by hand
// once a work order exists.
export async function cascadeMaintenanceRequestStatus(id, status, extra = {}) {
  return updateMaintenanceRequestStatus(id, status, extra);
}
