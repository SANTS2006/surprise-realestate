import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as platformAdminService from '../services/platformAdmin.service.js';
import * as accountService from '../services/platformAdminAccount.service.js';

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

export const overview = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await platformAdminService.getOverviewForPlatformAdmin() });
});

export const getOrganization = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await platformAdminService.getOrganizationDetailForPlatformAdmin(req.params.id) });
});

export const updateOrganization = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await platformAdminService.updateOrganizationByPlatformAdmin(req.params.id, req.body), message: 'Organization updated.' });
});

export const sendOrganizationAdminReset = asyncHandler(async (req, res) => {
  const result = await platformAdminService.sendOrganizationAdminPasswordReset(req.params.id, req.body.userId);
  sendSuccess(res, { data: result, message: 'Password reset link sent.' });
});

// ── Password reset + own account ──

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await accountService.requestPasswordReset(req.body.email);
  sendSuccess(res, { data: null, message: result.message });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await accountService.resetPasswordWithToken(req.body);
  sendSuccess(res, { data: null, message: 'Password updated. You can now sign in.' });
});

export const changePassword = asyncHandler(async (req, res) => {
  await accountService.changeOwnPassword(req.platformAdmin.id, req.body);
  sendSuccess(res, { data: null, message: 'Password changed successfully.' });
});

export const updateProfile = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await accountService.updateOwnProfile(req.platformAdmin.id, req.body), message: 'Profile updated.' });
});

// ── Other platform admins ──

export const listAdmins = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await accountService.listPlatformAdmins() });
});

export const createAdmin = asyncHandler(async (req, res) => {
  const admin = await accountService.createPlatformAdminByAdmin(req.body, req.platformAdmin.id);
  sendSuccess(res, { statusCode: 201, data: admin, message: 'Platform admin added and invited by email.' });
});

export const setAdminStatus = asyncHandler(async (req, res) => {
  const admin = await accountService.setPlatformAdminActive(req.params.id, req.body.isActive, req.platformAdmin.id);
  sendSuccess(res, { data: admin });
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
