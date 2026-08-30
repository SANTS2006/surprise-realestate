import { AppError } from '../utils/AppError.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import {
  createOwner, findOwnerById, findOwnerByUserId, findOwnersByOrganization,
  countOwnersByOrganization, updateOwner, setOwnerStatus,
} from '../repositories/owner.repository.js';
import { countPropertiesGroupedByOwner } from '../repositories/property.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { getCoverImageUrls } from './document.service.js';
import { audit } from './audit.service.js';

function serializeOwner(owner) {
  return {
    id: owner.id,
    userId: owner.userId,
    name: owner.name,
    email: owner.email,
    phone: owner.phone,
    address: owner.address,
    status: owner.status,
  };
}

// Enriches a page of owners with display-only fields a card needs: a
// signed cover photo and how many properties they currently own.
async function attachOwnerCardFields(organizationId, owners) {
  const ownerIds = owners.map((o) => o.id);
  const [coverUrls, propertyCounts] = await Promise.all([
    getCoverImageUrls(organizationId, 'owner', ownerIds),
    countPropertiesGroupedByOwner(organizationId, ownerIds),
  ]);
  const countByOwner = new Map(propertyCounts.map((row) => [row.ownerId, row._count._all]));

  return owners.map((o) => ({
    ...o,
    coverImageUrl: coverUrls.get(o.id) ?? null,
    propertyCount: countByOwner.get(o.id) ?? 0,
  }));
}

// An `owner`-role caller only ever sees their own record; every other role
// with `owners:read` (administrator, accountant, agent, auditor) sees the
// full organization directory. See docs/security/authorization.md.
export async function listOwners(organizationId, actingUser, { page, pageSize, skip, take, search, status }) {
  if (actingUser.roles.includes('owner') && !actingUser.roles.includes('administrator')) {
    const own = await findOwnerByUserId(actingUser.id, organizationId);
    const owners = own ? await attachOwnerCardFields(organizationId, [serializeOwner(own)]) : [];
    return { owners, meta: buildPaginationMeta({ page: 1, pageSize: 1, total: own ? 1 : 0 }) };
  }

  const [owners, total] = await Promise.all([
    findOwnersByOrganization(organizationId, { skip, take, search, status }),
    countOwnersByOrganization(organizationId, { search, status }),
  ]);
  const enriched = await attachOwnerCardFields(organizationId, owners.map(serializeOwner));
  return { owners: enriched, meta: buildPaginationMeta({ page, pageSize, total }) };
}

export async function getOwner(id, organizationId, actingUser) {
  const owner = await findOwnerById(id, organizationId);
  if (!owner) throw AppError.notFound('Owner not found.');

  if (actingUser.roles.includes('owner') && !actingUser.roles.includes('administrator') && owner.userId !== actingUser.id) {
    throw AppError.notFound('Owner not found.');
  }
  return serializeOwner(owner);
}

export async function createOwnerRecord(organizationId, body, actingUser, req) {
  if (body.userId) {
    const user = await findUserById(body.userId, organizationId);
    if (!user) throw AppError.badRequest('The specified user does not exist in this organization.');
  }

  const owner = await createOwner({
    organizationId,
    userId: body.userId ?? null,
    name: body.name,
    email: body.email ?? null,
    phone: body.phone ?? null,
    address: body.address ?? null,
  });

  await audit({ organizationId, userId: actingUser.id, action: 'owner.created', entityType: 'owner', entityId: owner.id, newValues: { name: owner.name }, req });
  return serializeOwner(owner);
}

export async function updateOwnerRecord(id, organizationId, body, actingUser, req) {
  const existing = await findOwnerById(id, organizationId);
  if (!existing) throw AppError.notFound('Owner not found.');

  await updateOwner(id, organizationId, body);
  await audit({ organizationId, userId: actingUser.id, action: 'owner.updated', entityType: 'owner', entityId: id, newValues: body, req });
  return getOwner(id, organizationId, actingUser);
}

export async function setOwnerActiveStatus(id, organizationId, status, actingUser, req) {
  const existing = await findOwnerById(id, organizationId);
  if (!existing) throw AppError.notFound('Owner not found.');

  await setOwnerStatus(id, organizationId, status);
  await audit({ organizationId, userId: actingUser.id, action: 'owner.status_changed', entityType: 'owner', entityId: id, oldValues: { status: existing.status }, newValues: { status }, req });
  return getOwner(id, organizationId, actingUser);
}
