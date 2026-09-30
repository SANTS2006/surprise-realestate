import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);
const hexColor = z.string().trim().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, 'Enter a valid hex color, e.g. #0F172A.');

export const platformAdminLoginSchema = z.object({
  body: z.object({
    email,
    password: z.string().min(1).max(128),
  }).strict(),
});

// multipart/form-data — the logo file itself is handled by Multer
// (middleware/upload.js) before this ever runs, so `req.body` here only
// carries the text fields.
export const createOrganizationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(150),
    slug: z.string().trim().min(2).max(50),
    adminFirstName: z.string().trim().min(1).max(100),
    adminLastName: z.string().trim().min(1).max(100),
    adminEmail: email,
    primaryColor: hexColor,
    secondaryColor: hexColor,
  }).strict(),
});

export const organizationStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['active', 'suspended']),
  }).strict(),
});

export const orgSlugParamSchema = z.object({
  params: z.object({ orgSlug: z.string().trim().min(1).max(50) }),
});
