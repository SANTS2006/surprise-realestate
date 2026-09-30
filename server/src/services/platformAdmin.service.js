import { prisma } from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { generateDefaultAdminPassword } from '../utils/defaultPassword.js';
import { normalizeSlug, assertValidSlug } from '../utils/slug.js';
import { sendMail } from '../integrations/email/mailer.js';
import { organizationCreatedEmail } from '../integrations/email/templates.js';
import { validateUploadedFile } from '../integrations/cloudinary/fileValidation.js';
import { uploadToCloudinary, generateSignedAccessUrl, destroyCloudinaryAsset } from '../integrations/cloudinary/uploadService.js';
import { createDocument } from '../repositories/document.repository.js';
import {
  findPlatformAdminByEmail, recordPlatformAdminFailedLogin, resetPlatformAdminFailedLogins,
} from '../repositories/platformAdmin.repository.js';
import {
  createOrganization, findOrganizationBySlug, findAllOrganizations, updateOrganization, updateOrganizationStatus,
  findOrganizationById,
} from '../repositories/organization.repository.js';
import { findUserByEmailGlobal, createUser } from '../repositories/user.repository.js';
import { findRoleByName, assignRoleToUser } from '../repositories/role.repository.js';
import { bootstrapDefaultRoles } from './role.service.js';
import { generateUniqueReferralCode } from '../utils/referralCode.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

// ── Platform admin auth (session-based, structurally separate from tenant
// auth — see middleware/platformAdminAuth.js) ──────────────────────────────

export async function loginPlatformAdmin({ email, password }, req) {
  const admin = await findPlatformAdminByEmail(email);

  if (!admin) {
    await verifyPassword('$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', password);
    throw AppError.unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    throw AppError.forbidden('This account is temporarily locked due to repeated failed sign-in attempts. Please try again later.');
  }

  const passwordValid = await verifyPassword(admin.passwordHash, password);
  if (!passwordValid) {
    const attempts = admin.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;
    await recordPlatformAdminFailedLogin(admin.id, { lock: shouldLock, lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : undefined });
    throw AppError.unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }

  await resetPlatformAdminFailedLogins(admin.id);

  await new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.platformAdminId = admin.id;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });

  logger.info({ platformAdminId: admin.id }, 'platform admin logged in');
  return { admin: { id: admin.id, firstName: admin.firstName, lastName: admin.lastName, email: admin.email } };
}

export function logoutPlatformAdmin(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
}

// ── Tenant organization management ──────────────────────────────────────

export async function listOrganizationsForPlatformAdmin() {
  const organizations = await findAllOrganizations();
  return organizations.map(serializeOrganizationForPlatformAdmin);
}

function serializeOrganizationForPlatformAdmin(org) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    email: org.email,
    status: org.status,
    primaryColor: org.primaryColor,
    secondaryColor: org.secondaryColor,
    hasLogo: Boolean(org.logoDocumentId),
    createdAt: org.createdAt,
  };
}

// Creates a tenant organization end-to-end: the org row, its full default
// role set (see role.service.js#bootstrapDefaultRoles — the same bootstrap
// a self-registering organization would have gotten back when this app was
// last multi-tenant), an administrator user with a system-generated
// password, and (if provided) uploads the logo — then emails the new
// administrator their login details. The logo upload happens after the
// transaction commits (Cloudinary is a network call and doesn't belong
// inside a DB transaction — see document.service.js for the same pattern),
// with the org row updated in a follow-up call once it succeeds.
export async function createOrganizationByPlatformAdmin({
  name, slug: rawSlug, adminFirstName, adminLastName, adminEmail, primaryColor, secondaryColor, logoFile,
}) {
  const slug = normalizeSlug(rawSlug);
  const slugError = assertValidSlug(slug);
  if (slugError) throw AppError.badRequest(slugError);

  const existingSlug = await findOrganizationBySlug(slug);
  if (existingSlug) throw AppError.conflict('That URL name is already taken by another organization.');

  const existingUser = await findUserByEmailGlobal(adminEmail);
  if (existingUser) throw AppError.conflict('An account with this administrator email already exists.');

  const year = new Date().getFullYear();
  const defaultPassword = generateDefaultAdminPassword(name, year);
  const passwordHash = await hashPassword(defaultPassword);
  const referralCode = await generateUniqueReferralCode(adminFirstName);

  const { organization, adminUser } = await prisma.$transaction(async (tx) => {
    const org = await createOrganization({
      name, slug, email: adminEmail, primaryColor, secondaryColor, status: 'active',
    }, tx);

    await bootstrapDefaultRoles(org.id, tx);
    const adminRole = await findRoleByName(org.id, 'administrator', tx);
    if (!adminRole) throw AppError.internal('Failed to set up the default administrator role.');

    const user = await createUser({
      organizationId: org.id, firstName: adminFirstName, lastName: adminLastName, email: adminEmail,
      passwordHash, status: 'active', emailVerified: true, referralCode,
    }, tx);
    await assignRoleToUser(user.id, adminRole.id, tx);

    return { organization: org, adminUser: user };
  }, { timeout: 15_000 });

  if (logoFile) {
    try {
      const { resourceType, mimeType, safeFilename } = await validateUploadedFile(logoFile.buffer, logoFile.originalname, logoFile.mimetype);
      const uploadResult = await uploadToCloudinary(logoFile.buffer, {
        organizationId: organization.id, entityType: 'organization', entityId: organization.id, resourceType, safeFilename,
      });
      let document;
      try {
        document = await createDocument({
          organizationId: organization.id,
          entityType: 'organization',
          entityId: organization.id,
          cloudinaryPublicId: uploadResult.public_id,
          cloudinaryResourceType: uploadResult.resource_type,
          cloudinaryAssetType: 'authenticated',
          originalFilename: safeFilename,
          mimeType,
          fileSize: uploadResult.bytes,
          uploadedBy: adminUser.id,
          status: 'active',
        });
      } catch (err) {
        await destroyCloudinaryAsset({ publicId: uploadResult.public_id, resourceType: uploadResult.resource_type });
        throw err;
      }
      await updateOrganization(organization.id, { logoDocumentId: document.id });
    } catch (err) {
      // The organization and its administrator already exist and are usable
      // without a logo — a failed logo upload must never undo that. Logged
      // for follow-up; the platform admin can re-upload from the org's own
      // Settings page once they're able to sign in.
      logger.error({ err, organizationId: organization.id }, 'logo upload failed during organization creation');
    }
  }

  const loginUrl = `${env.CLIENT_URL}/${slug}/login`;
  try {
    const { subject, html, text } = organizationCreatedEmail({
      organizationName: name, adminFirstName, loginEmail: adminEmail, defaultPassword, loginUrl,
    });
    await sendMail({ to: adminEmail, subject, html, text });
  } catch (err) {
    logger.error({ err, organizationId: organization.id }, 'failed to send organization-created email');
  }

  logger.info({ organizationId: organization.id, slug }, 'organization created by platform admin');
  return { organization: serializeOrganizationForPlatformAdmin(organization), loginUrl };
}

export async function setOrganizationStatusByPlatformAdmin(organizationId, status) {
  const organization = await findOrganizationById(organizationId);
  if (!organization) throw AppError.notFound('Organization not found.');

  const updated = await updateOrganizationStatus(organizationId, status);
  logger.info({ organizationId, status }, 'organization status changed by platform admin');
  return serializeOrganizationForPlatformAdmin(updated);
}

// Public, unauthenticated lookup — powers a tenant's branded login/register/
// forgot-password pages before anyone is signed in. Deliberately returns
// only branding fields, never anything that would let one organization
// learn about another's existence beyond "this exact slug does or doesn't
// resolve to something." A suspended org still resolves (so its branded
// page can show the "deactivated, contact the platform admin" message)
// — only the login attempt itself is blocked, in auth.service.js.
export async function getOrganizationBrandingBySlug(slug) {
  const organization = await findOrganizationBySlug(normalizeSlug(slug));
  if (!organization) throw AppError.notFound('This organization could not be found.');

  let logoUrl = null;
  if (organization.logoDocumentId) {
    const doc = await prisma.document.findUnique({ where: { id: organization.logoDocumentId } });
    if (doc) logoUrl = generateSignedAccessUrl({ publicId: doc.cloudinaryPublicId, resourceType: doc.cloudinaryResourceType }, 60 * 60).url;
  }

  return {
    name: organization.name,
    slug: organization.slug,
    primaryColor: organization.primaryColor,
    secondaryColor: organization.secondaryColor,
    logoUrl,
    active: organization.status === 'active',
  };
}
