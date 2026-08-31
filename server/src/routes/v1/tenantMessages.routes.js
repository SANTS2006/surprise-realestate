import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/authorize.js';
import { csrfProtection } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import * as tenantMessageController from '../../controllers/tenantMessage.controller.js';
import { listTenantMessagesSchema, createTenantMessageSchema } from '../../validators/tenantMessage.validators.js';

export const tenantMessagesRouter = Router();

tenantMessagesRouter.use(authenticate);
tenantMessagesRouter.get('/', requirePermission('tenant-messages:read'), validate(listTenantMessagesSchema), tenantMessageController.list);
tenantMessagesRouter.post('/', csrfProtection, requirePermission('tenant-messages:create'), validate(createTenantMessageSchema), tenantMessageController.create);
