import { Router } from 'express';
import { authRateLimiter } from '../../middleware/security.js';
import { csrfProtection } from '../../middleware/csrf.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as authController from '../../controllers/auth.controller.js';
import {
  registerSchema, loginSchema, mfaChallengeSchema, verifyEmailSchema,
  resendVerificationSchema, forgotPasswordSchema, resetPasswordSchema,
  changePasswordSchema, mfaConfirmSchema, mfaDisableSchema, tokenLoginSchema,
  refreshTokenSchema,
} from '../../validators/auth.validators.js';

export const authRouter = Router();

// Each brute-force-sensitive route gets its OWN limiter instance (its own
// independent counter store), not one shared across all of them — sharing a
// single bucket across register/login/reset/mfa/token would mean an
// ordinary user's register → verify → login → occasional forgot-password
// sequence could exhaust the same 10-request/15-min budget an attacker
// would be throttled by, locking out legitimate use. A limiter is still
// reused across the couple of routes that are genuinely the same
// credential-guessing surface (e.g. /token and /token/refresh both guard
// the JWT issuance surface).
authRouter.post('/register', authRateLimiter(), csrfProtection, validate(registerSchema), authController.register);
authRouter.post('/verify-email', authRateLimiter(), csrfProtection, validate(verifyEmailSchema), authController.verifyEmail);
authRouter.post('/resend-verification', authRateLimiter(), csrfProtection, validate(resendVerificationSchema), authController.resendVerification);

// ── Session login (browser) ──────────────────────────────────────────────
authRouter.post('/login', authRateLimiter(), csrfProtection, validate(loginSchema), authController.login);
authRouter.post('/mfa/challenge', authRateLimiter(), csrfProtection, validate(mfaChallengeSchema), authController.mfaChallenge);
authRouter.post('/logout', csrfProtection, authenticate, authController.logout);
authRouter.post('/logout-all', csrfProtection, authenticate, authController.logoutAll);
authRouter.get('/me', authenticate, authController.me);

// ── Password management ──────────────────────────────────────────────────
authRouter.post('/change-password', authRateLimiter(), csrfProtection, authenticate, validate(changePasswordSchema), authController.changePassword);
authRouter.post('/forgot-password', authRateLimiter(), csrfProtection, validate(forgotPasswordSchema), authController.forgotPassword);
authRouter.post('/reset-password', authRateLimiter(), csrfProtection, validate(resetPasswordSchema), authController.resetPassword);

// ── MFA enrollment/management (authenticated) ────────────────────────────
authRouter.post('/mfa/enroll', csrfProtection, authenticate, authController.mfaEnroll);
authRouter.post('/mfa/confirm', authRateLimiter(), csrfProtection, authenticate, validate(mfaConfirmSchema), authController.mfaConfirm);
authRouter.post('/mfa/disable', authRateLimiter(), csrfProtection, authenticate, validate(mfaDisableSchema), authController.mfaDisable);

// ── JWT (mobile / external API clients — no cookies, so no CSRF token) ──
const tokenLimiter = authRateLimiter();
authRouter.post('/token', tokenLimiter, validate(tokenLoginSchema), authController.tokenLogin);
authRouter.post('/token/refresh', tokenLimiter, validate(refreshTokenSchema), authController.tokenRefresh);
authRouter.post('/token/revoke', validate(refreshTokenSchema), authController.tokenRevoke);
