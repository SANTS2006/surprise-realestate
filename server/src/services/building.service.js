import { AppError } from '../utils/AppError.js';
import { findPropertyById } from '../repositories/property.repository.js';
import {
  createBuilding, findBuildingById, findBuildingsByProperty, updateBuilding, deleteBuilding,
} from '../repositories/building.repository.js';
import { findUnitsByBuilding, getUnitSummaryByBuildingIds } from '../repositories/unit.repository.js';
import { getCoverImageUrls } from './document.service.js';
import { assertPropertyAccess } from './resourceAccess.service.js';
import { audit } from './audit.service.js';

const EMPTY_UNIT_SUMMARY = { total: 0, available: 0, occupied: 0, reserved: 0, under_maintenance: 0, unavailable: 0 };

function serializeBuilding(building) {
  return { id: building.id, propertyId: building.propertyId, name: building.name, code: building.code, floors: building.floors, description: building.description };
}

async function loadPropertyWithAccess(propertyId, organizationId, actingUser) {
  const property = await findPropertyById(propertyId, organizationId);
  if (!property) throw AppError.notFound('Property not found.');
  await assertPropertyAccess(property, actingUser);
  return property;
}

export async function listBuildings(propertyId, organizationId, actingUser) {
  await loadPropertyWithAccess(propertyId, organizationId, actingUser);
  const buildings = await findBuildingsByProperty(propertyId, organizationId);
  const buildingIds = buildings.map((b) => b.id);

  const [unitRows, coverUrls] = await Promise.all([
    getUnitSummaryByBuildingIds(buildingIds),
    getCoverImageUrls(organizationId, 'building', buildingIds),
  ]);

  const unitSummaryByBuilding = new Map(buildingIds.map((id) => [id, { ...EMPTY_UNIT_SUMMARY }]));
  for (const row of unitRows) {
    const summary = unitSummaryByBuilding.get(row.buildingId);
    summary[row.status] = (summary[row.status] ?? 0) + row._count._all;
    summary.total += row._count._all;
  }

  return buildings.map((b) => ({
    ...serializeBuilding(b),
    unitSummary: unitSummaryByBuilding.get(b.id),
    coverImageUrl: coverUrls.get(b.id) ?? null,
  }));
}

export async function getBuilding(id, organizationId, actingUser) {
  const building = await findBuildingById(id, organizationId);
  if (!building) throw AppError.notFound('Building not found.');
  await assertPropertyAccess(building.property, actingUser);
  return serializeBuilding(building);
}

export async function createBuildingRecord(propertyId, organizationId, body, actingUser, req) {
  await loadPropertyWithAccess(propertyId, organizationId, actingUser);

  const building = await createBuilding({ propertyId, name: body.name, code: body.code ?? null, floors: body.floors ?? null, description: body.description ?? null });
  await audit({ organizationId, userId: actingUser.id, action: 'building.created', entityType: 'building', entityId: building.id, newValues: { name: building.name, propertyId }, req });
  return serializeBuilding(building);
}

export async function updateBuildingRecord(id, organizationId, body, actingUser, req) {
  const building = await findBuildingById(id, organizationId);
  if (!building) throw AppError.notFound('Building not found.');
  await assertPropertyAccess(building.property, actingUser);

  await updateBuilding(id, organizationId, body);
  await audit({ organizationId, userId: actingUser.id, action: 'building.updated', entityType: 'building', entityId: id, newValues: body, req });
  return getBuilding(id, organizationId, actingUser);
}

export async function deleteBuildingRecord(id, organizationId, actingUser, req) {
  const building = await findBuildingById(id, organizationId);
  if (!building) throw AppError.notFound('Building not found.');
  await assertPropertyAccess(building.property, actingUser);

  // Deleting a building cascades to its units at the database level — block
  // it here if any unit currently has an active lease, so a lease record
  // never gets silently orphaned by a structural change elsewhere.
  const units = await findUnitsByBuilding(id, organizationId);
  const hasOccupiedUnit = units.some((u) => u.status === 'occupied');
  if (hasOccupiedUnit) {
    throw AppError.conflict('This building has an occupied unit with an active lease and cannot be deleted.');
  }

  await deleteBuilding(id, organizationId);
  await audit({ organizationId, userId: actingUser.id, action: 'building.deleted', entityType: 'building', entityId: id, req });
  return { deleted: true };
}
