import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import * as publicListingService from '../services/publicListing.service.js';
import * as publicInquiryService from '../services/publicInquiry.service.js';

const ORG_ID = publicListingService.primaryOrganizationId();

export const listListings = asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const result = await publicListingService.listPublicListings(ORG_ID, {
    page, pageSize, skip, take,
    city: req.query.neighborhood,
    unitType: req.query.type,
    maxPrice: req.query.maxPrice,
    minBedrooms: req.query.minBeds,
    sort: req.query.sort,
  });
  sendSuccess(res, { data: result.listings, meta: result.meta });
});

export const getListing = asyncHandler(async (req, res) => {
  const listing = await publicListingService.getPublicListing(req.params.id, ORG_ID);
  sendSuccess(res, { data: listing });
});

export const getFilterOptions = asyncHandler(async (req, res) => {
  const options = await publicListingService.getPublicFilterOptions(ORG_ID);
  sendSuccess(res, { data: options });
});

export const getAgents = asyncHandler(async (req, res) => {
  const agents = await publicListingService.getPublicAgents(ORG_ID);
  sendSuccess(res, { data: agents });
});

export const createListingInquiry = asyncHandler(async (req, res) => {
  const result = await publicInquiryService.sendListingInquiry(ORG_ID, { listingId: req.params.id, ...req.body });
  sendSuccess(res, { statusCode: 201, data: result, message: 'Your message has been sent.' });
});

export const createGeneralContact = asyncHandler(async (req, res) => {
  const result = await publicInquiryService.sendGeneralContact(ORG_ID, req.body);
  sendSuccess(res, { statusCode: 201, data: result, message: 'Your message has been sent.' });
});
