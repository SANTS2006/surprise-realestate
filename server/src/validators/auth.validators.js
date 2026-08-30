import { z } from 'zod';

// Server-side validation is authoritative — these mirror (but do not defer
// to) the client's react-hook-form + Zod validation in client/src/validations.
// Every body schema is `.strict()`: an unrecognized field (e.g. a client
// trying to smuggle `status`, `organizationId`, or `emailVerified` into
// registration) is rejected outright (422) rather than silently dropped —
// the same mass-assignment-defense convention used everywhere else in
// validators/, even though the service layer's explicit destructuring
// already independently prevents any such field from reaching the database.
const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);
const password = z.string().min(12).max(128);

export const registerSchema = z.object({
  body: z.object({
    // No longer collected from the register form — registerOrganization()
    // auto-generates a name when this is absent. Still accepted (optional)
    // rather than rejected, so nothing breaks if a caller does send one.
    organizationName: z.string().trim().min(2).max(200).optional(),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email,
    password,
  }).strict(),
});

export const loginSchema = z.object({
  body: z.object({
    email,
    password: z.string().min(1).max(128),
  }).strict(),
});

export const mfaChallengeSchema = z.object({
  body: z.object({
    mfaToken: z.string().min(1),
    code: z.string().trim().min(6).max(11), // 6-digit TOTP or XXXXX-XXXXX recovery code
  }).strict(),
});

export const verifyEmailSchema = z.object({
  body: z.object({ token: z.string().min(1) }).strict(),
});

export const resendVerificationSchema = z.object({
  body: z.object({ email }).strict(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email }).strict(),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    newPassword: password,
  }).strict(),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: password,
  }).strict(),
});

export const mfaConfirmSchema = z.object({
  body: z.object({ code: z.string().trim().length(6) }).strict(),
});

export const mfaDisableSchema = z.object({
  body: z.object({
    password: z.string().min(1).max(128),
    code: z.string().trim().length(6),
  }).strict(),
});

export const tokenLoginSchema = z.object({
  body: z.object({
    email,
    password: z.string().min(1).max(128),
    mfaCode: z.string().trim().length(6).optional(),
  }).strict(),
});

export const refreshTokenSchema = z.object({
  body: z.object({ refreshToken: z.string().min(1) }).strict(),
});
