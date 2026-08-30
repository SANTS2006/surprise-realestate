import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as authService from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerOrganization(req.body, req);
  sendSuccess(res, {
    statusCode: 201,
    data: result,
    message: 'Account created. Please check your email to verify your address before signing in.',
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body.token, req);
  sendSuccess(res, { data: result, message: 'Email address verified. You can now sign in.' });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const result = await authService.resendVerificationEmail(req.body.email, req);
  sendSuccess(res, { data: null, message: result.message });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, req);
  if (result.mfaRequired) {
    return sendSuccess(res, { data: { mfaRequired: true, mfaToken: result.mfaToken }, message: 'Multi-factor authentication code required.' });
  }
  sendSuccess(res, { data: result, message: 'Signed in successfully.' });
});

export const mfaChallenge = asyncHandler(async (req, res) => {
  const result = await authService.completeMfaChallenge(req.body, req);
  sendSuccess(res, { data: result, message: 'Signed in successfully.' });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req);
  res.clearCookie('rems.sid');
  sendSuccess(res, { data: null, message: 'Signed out successfully.' });
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAllSessions(req.user.id, req.user.organizationId, req);
  res.clearCookie('rems.sid');
  sendSuccess(res, { data: null, message: 'Signed out of all devices.' });
});

export const me = asyncHandler(async (req, res) => {
  const profile = await authService.getCurrentUser(req.user.id, req.user.organizationId);
  sendSuccess(res, { data: profile });
});

export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.user.organizationId, req.body, req);
  sendSuccess(res, { data: result, message: 'Password changed successfully.' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email, req);
  sendSuccess(res, { data: null, message: result.message });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body, req);
  sendSuccess(res, { data: result, message: 'Password reset successfully. You can now sign in.' });
});

export const mfaEnroll = asyncHandler(async (req, res) => {
  const result = await authService.enrollMfa(req.user.id, req.user.organizationId, req);
  sendSuccess(res, { data: result, message: 'Scan the QR code with your authenticator app, then confirm with a code to finish enabling MFA.' });
});

export const mfaConfirm = asyncHandler(async (req, res) => {
  const result = await authService.confirmMfaEnrollment(req.user.id, req.user.organizationId, req.body.code, req);
  sendSuccess(res, { data: result, message: 'Multi-factor authentication enabled. Save your recovery codes somewhere safe — they will not be shown again.' });
});

export const mfaDisable = asyncHandler(async (req, res) => {
  const result = await authService.disableMfaForUser(req.user.id, req.user.organizationId, req.body, req);
  sendSuccess(res, { data: result, message: 'Multi-factor authentication disabled.' });
});

export const tokenLogin = asyncHandler(async (req, res) => {
  const result = await authService.loginForToken(req.body, req);
  if (result.mfaRequired) {
    return sendSuccess(res, { data: { mfaRequired: true }, message: 'Multi-factor authentication code required — resend with mfaCode.' });
  }
  sendSuccess(res, { data: result, message: 'Token issued successfully.' });
});

export const tokenRefresh = asyncHandler(async (req, res) => {
  const result = await authService.refreshTokenPair(req.body.refreshToken, req);
  sendSuccess(res, { data: result, message: 'Token refreshed successfully.' });
});

export const tokenRevoke = asyncHandler(async (req, res) => {
  const result = await authService.revokeRefreshToken(req.body.refreshToken);
  sendSuccess(res, { data: result, message: 'Token revoked.' });
});
