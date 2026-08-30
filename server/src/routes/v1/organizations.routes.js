import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/authorize.js';
import { csrfProtection } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import * as organizationController from '../../controllers/organization.controller.js';
import { updateOrganizationSchema } from '../../validators/organization.validators.js';

export const organizationsRouter = Router();

organizationsRouter.use(authenticate);

// Scoped to the caller's own organization only — there is no "get
// organization by id" route, which would otherwise need its own IDOR check
// for every caller. See services/organization.service.js.
organizationsRouter.get('/me', requirePermission('organizations:read'), organizationController.getMyOrganization);
organizationsRouter.patch('/me', csrfProtection, requirePermission('organizations:update'), validate(updateOrganizationSchema), organizationController.updateMyOrganization);
