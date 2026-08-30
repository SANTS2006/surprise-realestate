import { z } from 'zod';
import { paginationQuery, uuidParam } from './common.validators.js';

const latitude = z.coerce.number().min(-90).max(90).nullable().optional();
const longitude = z.coerce.number().min(-180).max(180).nullable().optional();

export const listPropertiesSchema = z.object({
  query: z.object({
    ...paginationQuery,
    status: z.enum(['active', 'archived', 'under_construction']).optional(),
  }),
});

export const propertyIdParamSchema = z.object({ params: z.object(uuidParam('id')) });

export const createPropertySchema = z.object({
  body: z.object({
    propertyCode: z.string().trim().min(1).max(50),
    name: z.string().trim().min(1).max(200),
    propertyType: z.string().trim().min(1).max(50),
    description: z.string().trim().max(2000).nullable().optional(),
    address: z.string().trim().min(1).max(300),
    city: z.string().trim().max(100).nullable().optional(),
    region: z.string().trim().max(100).nullable().optional(),
    country: z.string().trim().max(100).nullable().optional(),
    latitude,
    longitude,
    yearBuilt: z.coerce.number().int().min(1800).max(2100).nullable().optional(),
    ownerId: z.string().uuid().nullable().optional(),
  }).strict(),
});

export const updatePropertySchema = z.object({
  params: z.object(uuidParam('id')),
  body: z.object({
    name: z.string().trim().min(1).max(200).optional(),
    propertyType: z.string().trim().min(1).max(50).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    address: z.string().trim().min(1).max(300).optional(),
    city: z.string().trim().max(100).nullable().optional(),
    region: z.string().trim().max(100).nullable().optional(),
    country: z.string().trim().max(100).nullable().optional(),
    latitude,
    longitude,
    yearBuilt: z.coerce.number().int().min(1800).max(2100).nullable().optional(),
    ownerId: z.string().uuid().nullable().optional(),
  }).strict(),
});

export const assignStaffSchema = z.object({
  params: z.object(uuidParam('id')),
  body: z.object({ userId: z.string().uuid() }),
});

export const unassignStaffSchema = z.object({
  params: z.object({ ...uuidParam('id'), userId: z.string().uuid() }),
});
