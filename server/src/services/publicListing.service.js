import { AppError } from '../utils/AppError.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import { env } from '../config/env.js';
import {
  findAvailableUnitsPublic, countAvailableUnitsPublic, findAvailableUnitByIdPublic,
  findDistinctCitiesPublic, findDistinctUnitTypesPublic,
} from '../repositories/publicListing.repository.js';
import { findLatestImageDocumentsByEntityIds, findDocumentsByEntity } from '../repositories/document.repository.js';
import { findAgentAssignmentsForProperty, findAllAgents } from '../repositories/propertyAssignment.repository.js';
import { generateSignedAccessUrl } from '../integrations/cloudinary/uploadService.js';

// Public images are served through the exact same signed-URL mechanism as
// the authenticated app (see document.service.js) — nothing about Cloudinary
// storage changes for "public" listing photos, only who's allowed to ask for
// a signed URL to view them (see publicListing.repository.js's availability/
// organization filter, which is the real access boundary). A longer TTL
// than the authenticated app's 5 minutes is deliberate: an anonymous visitor
// may sit on a listing page far longer than a logged-in session action.
const LISTING_IMAGE_TTL_SECONDS = 60 * 60;

function toSignedUrl(doc) {
  return generateSignedAccessUrl({ publicId: doc.cloudinaryPublicId, resourceType: doc.cloudinaryResourceType }, LISTING_IMAGE_TTL_SECONDS).url;
}

function listingTitle(unit) {
  const property = unit.building.property;
  return `${property.name} — Unit ${unit.unitNumber}`;
}

function serializeAgent(assignment) {
  const user = assignment.user;
  return { name: `${user.firstName} ${user.lastName}`, email: user.email, phone: user.phone };
}

function baseListingFields(unit) {
  const property = unit.building.property;
  return {
    id: unit.id,
    title: listingTitle(unit),
    type: unit.unitType || property.propertyType,
    price: unit.monthlyRent,
    bedrooms: unit.bedrooms ?? 0,
    bathrooms: unit.bathrooms ?? 0,
    area: unit.area,
    description: unit.description || property.description || '',
    address: property.address,
    city: property.city,
    region: property.region,
    country: property.country,
    // null when the property has never had coordinates set — the client
    // renders no map/pin for a listing missing these rather than guessing.
    lat: property.latitude !== null && property.latitude !== undefined ? Number(property.latitude) : null,
    lng: property.longitude !== null && property.longitude !== undefined ? Number(property.longitude) : null,
    yearBuilt: property.yearBuilt,
  };
}

export async function listPublicListings(organizationId, { page, pageSize, skip, take, city, unitType, maxPrice, minBedrooms, sort }) {
  const [units, total] = await Promise.all([
    findAvailableUnitsPublic(organizationId, { skip, take, city, unitType, maxPrice, minBedrooms, sort }),
    countAvailableUnitsPublic(organizationId, { city, unitType, maxPrice, minBedrooms }),
  ]);

  // Cover image, unit-level first, falling back to the property's own cover
  // photo for units that have no interior shots uploaded yet.
  const unitIds = units.map((u) => u.id);
  const propertyIds = [...new Set(units.map((u) => u.building.property.id))];
  const [unitCovers, propertyCovers] = await Promise.all([
    findLatestImageDocumentsByEntityIds(organizationId, 'unit', unitIds),
    findLatestImageDocumentsByEntityIds(organizationId, 'property', propertyIds),
  ]);
  const unitCoverMap = new Map();
  for (const doc of unitCovers) if (!unitCoverMap.has(doc.entityId)) unitCoverMap.set(doc.entityId, doc);
  const propertyCoverMap = new Map();
  for (const doc of propertyCovers) if (!propertyCoverMap.has(doc.entityId)) propertyCoverMap.set(doc.entityId, doc);

  const listings = units.map((unit) => {
    const cover = unitCoverMap.get(unit.id) ?? propertyCoverMap.get(unit.building.property.id);
    return {
      ...baseListingFields(unit),
      coverImage: cover ? toSignedUrl(cover) : null,
    };
  });

  return { listings, meta: buildPaginationMeta({ page, pageSize, total }) };
}

export async function getPublicListing(id, organizationId) {
  const unit = await findAvailableUnitByIdPublic(id, organizationId);
  if (!unit) throw AppError.notFound('This listing is no longer available.');

  const property = unit.building.property;
  const [unitDocs, propertyDocs, assignments] = await Promise.all([
    findDocumentsByEntity(organizationId, 'unit', unit.id, { skip: 0, take: 50 }),
    findDocumentsByEntity(organizationId, 'property', property.id, { skip: 0, take: 50 }),
    findAgentAssignmentsForProperty(property.id, organizationId),
  ]);

  const images = [...unitDocs, ...propertyDocs]
    .filter((d) => d.mimeType.startsWith('image/'))
    .map(toSignedUrl);

  return {
    ...baseListingFields(unit),
    images,
    amenities: [], // no dedicated amenities field on Unit/Property today — see docs note in the public API
    agent: assignments[0] ? serializeAgent(assignments[0]) : null,
  };
}

export async function getPublicFilterOptions(organizationId) {
  const [cities, unitTypes] = await Promise.all([
    findDistinctCitiesPublic(organizationId),
    findDistinctUnitTypesPublic(organizationId),
  ]);
  return { cities, unitTypes };
}

export async function getPublicAgents(organizationId) {
  const agents = await findAllAgents(organizationId);
  const photoMap = await findLatestImageDocumentsByEntityIds(organizationId, 'user', agents.map((a) => a.id));
  const photoByUserId = new Map();
  for (const doc of photoMap) if (!photoByUserId.has(doc.entityId)) photoByUserId.set(doc.entityId, doc);

  return agents.map((a) => ({
    id: a.id,
    name: `${a.firstName} ${a.lastName}`,
    email: a.email,
    phone: a.phone,
    photo: photoByUserId.has(a.id) ? toSignedUrl(photoByUserId.get(a.id)) : null,
  }));
}

// Resolves the listing agent(s) for an inquiry/contact email — shared by
// publicInquiry.service.js so it never has to know how a unit maps to a
// property maps to its assigned agents.
export async function getListingAgentAssignments(unitId, organizationId) {
  const unit = await findAvailableUnitByIdPublic(unitId, organizationId);
  if (!unit) return { unit: null, assignments: [] };
  const assignments = await findAgentAssignmentsForProperty(unit.building.property.id, organizationId);
  return { unit, assignments };
}

export function primaryOrganizationId() {
  return env.PRIMARY_ORGANIZATION_ID;
}
