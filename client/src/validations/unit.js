import { z } from 'zod';

const emptyToUndefined = (v) => (v === '' || v === null || v === undefined ? undefined : v);
const optionalNumber = (schema) => z.preprocess(emptyToUndefined, schema.optional());
const optionalString = (schema) => z.preprocess(emptyToUndefined, schema.optional());
const money = optionalNumber(z.coerce.number().nonnegative().max(9_999_999_999));

export const unitFormSchema = z.object({
  unitNumber: z.string().trim().min(1, 'Unit number is required.').max(50),
  unitType: optionalString(z.string().trim().max(50)),
  floor: optionalNumber(z.coerce.number().int().min(-10).max(300)),
  bedrooms: optionalNumber(z.coerce.number().int().min(0).max(50)),
  bathrooms: optionalNumber(z.coerce.number().int().min(0).max(50)),
  area: money,
  monthlyRent: z.coerce.number({ invalid_type_error: 'Monthly rent is required.' }).positive('Monthly rent must be greater than 0.').max(9_999_999_999),
  securityDeposit: money,
  description: optionalString(z.string().trim().max(2000)),
});
