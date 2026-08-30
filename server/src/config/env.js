import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Fail fast and loud if the runtime environment is misconfigured — never start
// the server with silently-defaulted secrets in production.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url(),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL (Neon pooled connection) is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL (Neon direct connection) is required'),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(30),
  SESSION_ABSOLUTE_TIMEOUT_HOURS: z.coerce.number().int().positive().default(12),

  // 32-byte (64 hex char) key used only to symmetrically encrypt TOTP MFA
  // secrets at rest (AES-256-GCM) — distinct from the signing secrets below
  // because it protects data that must be decrypted, not just verified.
  MFA_ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/i, 'MFA_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  JWT_ISSUER: z.string().default('rems-api'),
  JWT_AUDIENCE: z.string().default('rems-clients'),

  CORS_ORIGINS: z.string().min(1, 'CORS_ORIGINS is required (comma-separated exact origins)'),

  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),

  // Brevo's transactional HTTP API is the preferred send path when
  // BREVO_API_KEY is set (see integrations/email/mailer.js) — it needs no
  // separate SMTP login to guess at, just this one key. EMAIL_HOST/USER/
  // PASSWORD remain supported as a fallback for any other SMTP provider.
  BREVO_API_KEY: z.string().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  SUPPORT_EMAIL: z.string().email().optional(),

  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().int().positive().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
