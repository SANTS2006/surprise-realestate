import { AppError } from '../utils/AppError.js';
import { findOrganizationById, updateOrganization } from '../repositories/organization.repository.js';
import { audit } from './audit.service.js';

// The caller's own organizationId (from req.user, itself derived from the
// authenticated session/token — never from a route param) is the only
// organization this ever touches. There is no "get organization by
// arbitrary id" here; that would be a cross-tenant IDOR by construction.
export async function getMyOrganization(organizationId) {
  const organization = await findOrganizationById(organizationId);
  if (!organization) throw AppError.notFound('Organization not found.');
  return organization;
}

const UPDATABLE_FIELDS = ['name', 'legalName', 'registrationNumber', 'phone', 'address', 'city', 'region', 'country', 'settings'];

export async function updateMyOrganization(organizationId, body, actingUser, req) {
  const before = await findOrganizationById(organizationId);
  if (!before) throw AppError.notFound('Organization not found.');

  const data = {};
  for (const field of UPDATABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  const updated = await updateOrganization(organizationId, data);

  await audit({
    organizationId, userId: actingUser.id, action: 'organization.settings_updated', entityType: 'organization', entityId: organizationId,
    oldValues: Object.fromEntries(UPDATABLE_FIELDS.filter((f) => f in data).map((f) => [f, before[f]])),
    newValues: data,
    req,
  });

  return updated;
}
