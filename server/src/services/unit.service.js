import { AppError } from '../utils/AppError.js';
import { findBuildingById } from '../repositories/building.repository.js';
import {
  createUnit, findUnitById, findUnitsByBuilding, updateUnit, setUnitStatus, deleteUnit,
} from '../repositories/unit.repository.js';
import { findActiveLeaseForUnit } from '../repositories/lease.repository.js';
import { getCoverImageUrls } from './document.service.js';
import { assertPropertyAccess } from './resourceAccess.service.js';
import { audit } from './audit.service.js';

// `occupied` is set only as a side effect of a lease being activated/ended
// (see lease.service.js) — never accepted directly through this API, so a
// caller can't desync a unit's status from what's actually leased.
const MANUALLY_SETTABLE_STATUSES = new Set(['available', 'reserved', 'under_maintenance', 'unavailable']);

function serializeUnit(unit) {
  return {
    id: unit.id,
    buildingId: unit.buildingId,
    unitNumber: unit.unitNumber,
    unitType: unit.unitType,
    floor: unit.floor,
    bedrooms: unit.bedrooms,
    bathrooms: unit.bathrooms,
    area: unit.area,
    monthlyRent: unit.monthlyRent,
    securityDeposit: unit.securityDeposit,
    status: unit.status,
    description: unit.description,
  };
}

async function loadBuildingWithAccess(buildingId, organizationId, actingUser) {
  const building = await findBuildingById(buildingId, organizationId);
  if (!building) throw AppError.notFound('Building not found.');
  await assertPropertyAccess(building.property, actingUser);
  return building;
}

export async function listUnits(buildingId, organizationId, actingUser, { status } = {}) {
  await loadBuildingWithAccess(buildingId, organizationId, actingUser);
  const units = await findUnitsByBuilding(buildingId, organizationId, { status });
  const coverUrls = await getCoverImageUrls(organizationId, 'unit', units.map((u) => u.id));
  return units.map((u) => ({ ...serializeUnit(u), coverImageUrl: coverUrls.get(u.id) ?? null }));
}

export async function getUnit(id, organizationId, actingUser) {
  const unit = await findUnitById(id, organizationId);
  if (!unit) throw AppError.notFound('Unit not found.');
  await assertPropertyAccess(unit.building.property, actingUser);
  return serializeUnit(unit);
}

export async function createUnitRecord(buildingId, organizationId, body, actingUser, req) {
  await loadBuildingWithAccess(buildingId, organizationId, actingUser);

  const unit = await createUnit({
    buildingId,
    unitNumber: body.unitNumber,
    unitType: body.unitType ?? null,
    floor: body.floor ?? null,
    bedrooms: body.bedrooms ?? null,
    bathrooms: body.bathrooms ?? null,
    area: body.area ?? null,
    monthlyRent: body.monthlyRent,
    securityDeposit: body.securityDeposit ?? null,
    description: body.description ?? null,
  });

  await audit({ organizationId, userId: actingUser.id, action: 'unit.created', entityType: 'unit', entityId: unit.id, newValues: { unitNumber: unit.unitNumber, buildingId }, req });
  return serializeUnit(unit);
}

export async function updateUnitRecord(id, organizationId, body, actingUser, req) {
  const unit = await findUnitById(id, organizationId);
  if (!unit) throw AppError.notFound('Unit not found.');
  await assertPropertyAccess(unit.building.property, actingUser);

  await updateUnit(id, organizationId, body);
  await audit({ organizationId, userId: actingUser.id, action: 'unit.updated', entityType: 'unit', entityId: id, newValues: body, req });
  return getUnit(id, organizationId, actingUser);
}

export async function setUnitManualStatus(id, organizationId, status, actingUser, req) {
  if (!MANUALLY_SETTABLE_STATUSES.has(status)) {
    throw AppError.badRequest(`Status "${status}" cannot be set directly — it is managed automatically by lease activity.`);
  }

  const unit = await findUnitById(id, organizationId);
  if (!unit) throw AppError.notFound('Unit not found.');
  await assertPropertyAccess(unit.building.property, actingUser);

  const activeLease = await findActiveLeaseForUnit(id);
  if (activeLease) {
    throw AppError.conflict('This unit has an active lease. Terminate the lease before changing its status.');
  }

  await setUnitStatus(id, status);
  await audit({ organizationId, userId: actingUser.id, action: 'unit.status_changed', entityType: 'unit', entityId: id, oldValues: { status: unit.status }, newValues: { status }, req });
  return getUnit(id, organizationId, actingUser);
}

export async function deleteUnitRecord(id, organizationId, actingUser, req) {
  const unit = await findUnitById(id, organizationId);
  if (!unit) throw AppError.notFound('Unit not found.');
  await assertPropertyAccess(unit.building.property, actingUser);

  if (unit.status === 'occupied') {
    throw AppError.conflict('This unit is currently occupied and cannot be deleted.');
  }

  await deleteUnit(id, organizationId);
  await audit({ organizationId, userId: actingUser.id, action: 'unit.deleted', entityType: 'unit', entityId: id, req });
  return { deleted: true };
}
