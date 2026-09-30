import { Router } from 'express';
import { authRateLimiter } from '../../middleware/security.js';
import { csrfProtection } from '../../middleware/csrf.js';
import { authenticatePlatformAdmin } from '../../middleware/platformAdminAuth.js';
import { singleFileUpload } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import * as platformAdminController from '../../controllers/platformAdmin.controller.js';
import { platformAdminLoginSchema, createOrganizationSchema, organizationStatusSchema } from '../../validators/platformAdmin.validators.js';

export const platformAdminRouter = Router();

platformAdminRouter.post('/auth/login', authRateLimiter(), csrfProtection, validate(platformAdminLoginSchema), platformAdminController.login);
platformAdminRouter.post('/auth/logout', csrfProtection, authenticatePlatformAdmin, platformAdminController.logout);
platformAdminRouter.get('/auth/me', authenticatePlatformAdmin, platformAdminController.me);

platformAdminRouter.get('/organizations', authenticatePlatformAdmin, platformAdminController.listOrganizations);
platformAdminRouter.post(
  '/organizations',
  authenticatePlatformAdmin,
  csrfProtection,
  singleFileUpload('logo'),
  validate(createOrganizationSchema),
  platformAdminController.createOrganization
);
platformAdminRouter.patch(
  '/organizations/:id/status',
  authenticatePlatformAdmin,
  csrfProtection,
  validate(organizationStatusSchema),
  platformAdminController.setOrganizationStatus
);
