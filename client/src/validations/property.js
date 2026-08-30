import { z } from 'zod';

// Mirrors server/src/validators/property.validators.js for immediate
// feedback — the server re-validates everything (see auth.js's identical
// note). Empty-string optional fields are normalized to undefined so
// react-hook-form's default '' doesn't fail z.coerce.number().
const emptyToUndefined = (v) => (v === '' || v === null || v === undefined ? undefined : v);
const optionalNumber = (schema) => z.preprocess(emptyToUndefined, schema.optional());
const optionalString = (schema) => z.preprocess(emptyToUndefined, schema.optional());

export const propertyFormSchema = z.object({
  propertyCode: z.string().trim().min(1, 'Property code is required.').max(50),
  name: z.string().trim().min(1, 'Property name is required.').max(200),
  propertyType: z.string().trim().min(1, 'Property type is required.').max(50),
  description: optionalString(z.string().trim().max(2000)),
  address: z.string().trim().min(1, 'Address is required.').max(300),
  city: optionalString(z.string().trim().max(100)),
  region: optionalString(z.string().trim().max(100)),
  country: optionalString(z.string().trim().max(100)),
  latitude: optionalNumber(z.coerce.number().min(-90).max(90)),
  longitude: optionalNumber(z.coerce.number().min(-180).max(180)),
  yearBuilt: optionalNumber(z.coerce.number().int().min(1800).max(2100)),
});
