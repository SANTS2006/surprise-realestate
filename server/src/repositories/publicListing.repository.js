import { prisma } from '../config/database.js';

// Every query here is scoped to (a) the primary organization (the caller
// always passes PRIMARY_ORGANIZATION_ID — see publicListing.service.js) and
// (b) units that are actually rentable right now: the unit itself
// `available`, and its property `active` (never archived/under
// construction). No authentication exists on this path, so these two
// filters are the entire access boundary — nothing here may ever leak a
// unit that isn't meant to be publicly listed.
function buildAvailableUnitWhere(organizationId, { city, unitType, maxPrice, minBedrooms }) {
  return {
    status: 'available',
    building: {
      property: {
        organizationId,
        status: 'active',
        ...(city ? { city } : {}),
      },
    },
    ...(unitType ? { unitType } : {}),
    ...(maxPrice ? { monthlyRent: { lte: maxPrice } } : {}),
    ...(minBedrooms ? { bedrooms: { gte: minBedrooms } } : {}),
  };
}

const UNIT_INCLUDE = {
  building: { include: { property: true } },
};

function sortToOrderBy(sort) {
  if (sort === 'price-asc') return { monthlyRent: 'asc' };
  if (sort === 'price-desc') return { monthlyRent: 'desc' };
  return { unitNumber: 'asc' }; // 'newest' - Unit has no createdAt column, so this is the stable default
}

export function findAvailableUnitsPublic(organizationId, { skip, take, city, unitType, maxPrice, minBedrooms, sort }) {
  return prisma.unit.findMany({
    where: buildAvailableUnitWhere(organizationId, { city, unitType, maxPrice, minBedrooms }),
    include: UNIT_INCLUDE,
    orderBy: sortToOrderBy(sort),
    skip,
    take,
  });
}

export function countAvailableUnitsPublic(organizationId, { city, unitType, maxPrice, minBedrooms }) {
  return prisma.unit.count({ where: buildAvailableUnitWhere(organizationId, { city, unitType, maxPrice, minBedrooms }) });
}

// A single listing's detail page — same availability/organization boundary
// as the list query (a direct-linked id for a unit that just got rented out
// or delisted correctly 404s rather than ever rendering).
export function findAvailableUnitByIdPublic(id, organizationId) {
  return prisma.unit.findFirst({
    where: { id, ...buildAvailableUnitWhere(organizationId, {}) },
    include: UNIT_INCLUDE,
  });
}

// Filter option lists for the browse page — only values that currently have
// at least one available listing, so the UI never offers a filter that
// would return zero results.
export async function findDistinctCitiesPublic(organizationId) {
  const rows = await prisma.property.findMany({
    where: { organizationId, status: 'active', city: { not: null }, buildings: { some: { units: { some: { status: 'available' } } } } },
    select: { city: true },
    distinct: ['city'],
    orderBy: { city: 'asc' },
  });
  return rows.map((r) => r.city).filter(Boolean);
}

export async function findDistinctUnitTypesPublic(organizationId) {
  const rows = await prisma.unit.findMany({
    where: buildAvailableUnitWhere(organizationId, {}),
    select: { unitType: true },
    distinct: ['unitType'],
  });
  return rows.map((r) => r.unitType).filter(Boolean).sort();
}
