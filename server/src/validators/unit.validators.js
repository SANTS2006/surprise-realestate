import { z } from 'zod';
import { uuidParam } from './common.validators.js';

export const buildingIdParamSchema = z.object({ params: z.object(uuidParam('buildingId')) });
export const unitIdParamSchema = z.object({ params: z.object(uuidParam('id')) });

const money = z.coerce.number().nonnegative().max(9_999_999_999).nullable().optional();

export const listUnitsSchema = z.object({
  params: z.object(uuidParam('buildingId')),
  query: z.object({ status: z.enum(['available', 'occupied', 'reserved', 'under_maintenance', 'unavailable']).optional() }),
});

export const createUnitSchema = z.object({
  params: z.object(uuidParam('buildingId')),
  body: z.object({
    unitNumber: z.string().trim().min(1).max(50),
    unitType: z.string().trim().max(50).nullable().optional(),
    floor: z.coerce.number().int().min(-10).max(300).nullable().optional(),
    bedrooms: z.coerce.number().int().min(0).max(50).nullable().optional(),
    bathrooms: z.coerce.number().int().min(0).max(50).nullable().optional(),
    area: money,
    monthlyRent: z.coerce.number().positive().max(9_999_999_999),
    securityDeposit: money,
    description: z.string().trim().max(2000).nullable().optional(),
  }).strict(),
});

export const updateUnitSchema = z.object({
  params: z.object(uuidParam('id')),
  body: z.object({
    unitNumber: z.string().trim().min(1).max(50).optional(),
    unitType: z.string().trim().max(50).nullable().optional(),
    floor: z.coerce.number().int().min(-10).max(300).nullable().optional(),
    bedrooms: z.coerce.number().int().min(0).max(50).nullable().optional(),
    bathrooms: z.coerce.number().int().min(0).max(50).nullable().optional(),
    area: money,
    monthlyRent: z.coerce.number().positive().max(9_999_999_999).optional(),
    securityDeposit: money,
    description: z.string().trim().max(2000).nullable().optional(),
  }).strict(),
});

export const setUnitStatusSchema = z.object({
  params: z.object(uuidParam('id')),
  body: z.object({ status: z.enum(['available', 'reserved', 'under_maintenance', 'unavailable']) }),
});
