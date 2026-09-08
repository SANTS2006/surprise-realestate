import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authRateLimiter } from '../../middleware/security.js';
import * as publicController from '../../controllers/public.controller.js';
import {
  listPublicListingsSchema, publicListingIdParamSchema, listingInquirySchema, generalContactSchema,
} from '../../validators/public.validators.js';

// No `authenticate` here — this router is the one deliberately unauthenticated
// surface in the API, serving the public listings site (a separate
// deployment/origin from the tenant/staff portal). Its access boundary is
// entirely inside publicListing.repository.js's query filters (organization
// + availability), the strict CORS origin allowlist, and rate limiting on
// the two write endpoints below — never a session or permission check,
// since there is no principal to check one against.
export const publicRouter = Router();

publicRouter.get('/listings', validate(listPublicListingsSchema), publicController.listListings);
publicRouter.get('/listings/filter-options', publicController.getFilterOptions);
publicRouter.get('/listings/:id', validate(publicListingIdParamSchema), publicController.getListing);
publicRouter.get('/agents', publicController.getAgents);
publicRouter.get('/stats', publicController.getStats);

// `authRateLimiter` isn't auth-specific in what it does (IP+email keyed
// rate limiting) — reused here to stop the public site's forms being used
// as a spam/email relay, the same way it stops login/reset brute-forcing.
publicRouter.post('/listings/:id/inquiries', authRateLimiter(10), validate(listingInquirySchema), publicController.createListingInquiry);
publicRouter.post('/contact', authRateLimiter(10), validate(generalContactSchema), publicController.createGeneralContact);
