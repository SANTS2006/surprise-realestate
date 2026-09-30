import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as platformAdminService from '../services/platformAdmin.service.js';

export const login = asyncHandler(async (req, res) => {
  const result = await platformAdminService.loginPlatformAdmin(req.body, req);
  sendSuccess(res, { data: result });
});

export const logout = asyncHandler(async (req, res) => {
  await platformAdminService.logoutPlatformAdmin(req);
  sendSuccess(res, { data: { loggedOut: true } });
});

export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: req.platformAdmin });
});

export const listOrganizations = asyncHandler(async (req, res) => {
  const organizations = await platformAdminService.listOrganizationsForPlatformAdmin();
  sendSuccess(res, { data: organizations });
});

export const createOrganization = asyncHandler(async (req, res) => {
  const result = await platformAdminService.createOrganizationByPlatformAdmin({
    ...req.body,
    logoFile: req.file,
  });
  sendSuccess(res, { statusCode: 201, data: result, message: 'Organization created and administrator notified by email.' });
});

export const setOrganizationStatus = asyncHandler(async (req, res) => {
  const organization = await platformAdminService.setOrganizationStatusByPlatformAdmin(req.params.id, req.body.status);
  sendSuccess(res, { data: organization });
});
