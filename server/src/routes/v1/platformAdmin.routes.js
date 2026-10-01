import { Router } from 'express';
import { authRateLimiter } from '../../middleware/security.js';
import { csrfProtection } from '../../middleware/csrf.js';
import { authenticatePlatformAdmin } from '../../middleware/platformAdminAuth.js';
import { singleFileUpload } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import * as platformAdminController from '../../controllers/platformAdmin.controller.js';
import {
  platformAdminLoginSchema, createOrganizationSchema, organizationStatusSchema, platformForgotPasswordSchema,
  platformResetPasswordSchema, platformChangePasswordSchema, platformProfileSchema, createPlatformAdminSchema,
  platformAdminStatusSchema, organizationIdParamSchema, updateOrganizationSchema, sendAdminResetSchema,
} from '../../validators/platformAdmin.validators.js';

export const platformAdminRouter = Router();

platformAdminRouter.post('/auth/login', authRateLimiter(), csrfProtection, validate(platformAdminLoginSchema), platformAdminController.login);
platformAdminRouter.post('/auth/logout', csrfProtection, authenticatePlatformAdmin, platformAdminController.logout);
platformAdminRouter.get('/auth/me', authenticatePlatformAdmin, platformAdminController.me);
platformAdminRouter.post('/auth/forgot-password', authRateLimiter(), csrfProtection, validate(platformForgotPasswordSchema), platformAdminController.forgotPassword);
platformAdminRouter.post('/auth/reset-password', authRateLimiter(), csrfProtection, validate(platformResetPasswordSchema), platformAdminController.resetPassword);
platformAdminRouter.post('/auth/change-password', authRateLimiter(), authenticatePlatformAdmin, csrfProtection, validate(platformChangePasswordSchema), platformAdminController.changePassword);
platformAdminRouter.patch('/auth/profile', authenticatePlatformAdmin, csrfProtection, validate(platformProfileSchema), platformAdminController.updateProfile);

platformAdminRouter.get('/overview', authenticatePlatformAdmin, platformAdminController.overview);

platformAdminRouter.get('/admins', authenticatePlatformAdmin, platformAdminController.listAdmins);
platformAdminRouter.post('/admins', authenticatePlatformAdmin, csrfProtection, validate(createPlatformAdminSchema), platformAdminController.createAdmin);
platformAdminRouter.delete('/admins/:id', authenticatePlatformAdmin, csrfProtection, validate(organizationIdParamSchema), platformAdminController.deleteAdmin);
platformAdminRouter.get('/audit-logs', authenticatePlatformAdmin, platformAdminController.listAuditLogs);
platformAdminRouter.patch('/admins/:id/status', authenticatePlatformAdmin, csrfProtection, validate(platformAdminStatusSchema), platformAdminController.setAdminStatus);

platformAdminRouter.get('/organizations', authenticatePlatformAdmin, platformAdminController.listOrganizations);
platformAdminRouter.post(
  '/organizations',
  authenticatePlatformAdmin,
  csrfProtection,
  singleFileUpload('logo'),
  validate(createOrganizationSchema),
  platformAdminController.createOrganization
);
platformAdminRouter.get('/organizations/:id', authenticatePlatformAdmin, validate(organizationIdParamSchema), platformAdminController.getOrganization);
platformAdminRouter.patch('/organizations/:id', authenticatePlatformAdmin, csrfProtection, validate(updateOrganizationSchema), platformAdminController.updateOrganization);
platformAdminRouter.post('/organizations/:id/logo', authenticatePlatformAdmin, csrfProtection, singleFileUpload('logo'), validate(organizationIdParamSchema), platformAdminController.replaceOrganizationLogo);
platformAdminRouter.post('/organizations/:id/send-admin-reset', authenticatePlatformAdmin, csrfProtection, validate(sendAdminResetSchema), platformAdminController.sendOrganizationAdminReset);
platformAdminRouter.patch(
  '/organizations/:id/status',
  authenticatePlatformAdmin,
  csrfProtection,
  validate(organizationStatusSchema),
  platformAdminController.setOrganizationStatus
);
