import { z } from 'zod';

const emptyToUndefined = (v) => (v === '' || v === null || v === undefined ? undefined : v);
const optionalString = (schema) => z.preprocess(emptyToUndefined, schema.optional());

export const ownerFormSchema = z.object({
  name: z.string().trim().min(1, 'Owner name is required.').max(200),
  email: optionalString(z.string().trim().toLowerCase().email('Enter a valid email address.').max(254)),
  phone: optionalString(z.string().trim().max(30)),
  address: optionalString(z.string().trim().max(300)),
});
