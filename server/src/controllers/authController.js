import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { ok, fail, AppError } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/agentValidator.js';
import { env, googleAuthEnabled, emailEnabled } from '../config/env.js';
import {
  createResetToken,
  consumeResetToken,
  isResetTokenValid,
} from '../services/passwordResetService.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

let googleClient = null;
function getGoogleClient() {
  if (!googleClient) googleClient = new OAuth2Client(env.googleClientId);
  return googleClient;
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);

  const existing = await User.findOne({ email });
  if (existing) throw new AppError('An account with that email already exists.', 409, 'EMAIL_TAKEN');

  const user = new User({ name, email });
  await user.setPassword(password);
  await user.save();

  const token = signToken(user._id);
  return ok(res, { token, user: user.toPublic() }, 'Account created.', 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) return fail(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');

  // Google-only account: point them at the right button instead of a dead end.
  if (!user.passwordHash && user.googleId) {
    return fail(res, 'This account uses Google sign-in. Continue with Google.', 401, 'USE_GOOGLE');
  }

  const valid = await user.verifyPassword(password);
  if (!valid) return fail(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');

  const token = signToken(user._id);
  return ok(res, { token, user: user.toPublic() }, 'Signed in.');
});

/**
 * POST /api/auth/google
 * Exchange a Google ID token for our own session token. Signs the user in if
 * the email already exists, otherwise creates the account.
 */
export const googleAuth = asyncHandler(async (req, res) => {
  if (!googleAuthEnabled()) {
    throw new AppError(
      'Google sign-in is not configured on the server.',
      503,
      'GOOGLE_NOT_CONFIGURED'
    );
  }

  const { credential } = googleAuthSchema.parse(req.body);

  let payload;
  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    return fail(res, 'Could not verify your Google sign-in. Please try again.', 401, 'GOOGLE_INVALID_TOKEN');
  }

  if (!payload?.email || !payload.email_verified) {
    return fail(res, 'Your Google account has no verified email.', 401, 'GOOGLE_EMAIL_UNVERIFIED');
  }

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ email });

  if (user) {
    // Link the Google identity to the existing account on first use.
    let dirty = false;
    if (!user.googleId) {
      user.googleId = payload.sub;
      dirty = true;
    }
    if (!user.avatarUrl && payload.picture) {
      user.avatarUrl = payload.picture;
      dirty = true;
    }
    if (dirty) await user.save();
  } else {
    user = await User.create({
      name: payload.name || email.split('@')[0],
      email,
      googleId: payload.sub,
      avatarUrl: payload.picture || '',
    });
  }

  const token = signToken(user._id);
  return ok(res, { token, user: user.toPublic() }, 'Signed in with Google.');
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return fail(res, 'User not found.', 404, 'USER_NOT_FOUND');
  return ok(res, { user: user.toPublic() });
});

/**
 * POST /api/auth/forgot-password
 * Emails a reset link if the address has an account. The response is IDENTICAL
 * whether or not the account exists, so it can't be used to discover who's
 * registered (anti-enumeration).
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() });

  let devToken;
  if (user) {
    const token = await createResetToken(user._id);
    const resetUrl = `${env.appUrl}/reset-password/${token}`;
    try {
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    } catch (err) {
      // Never surface a provider failure to the caller (would leak existence);
      // log it so the operator can react.
      if (!env.isTest) {
        // eslint-disable-next-line no-console
        console.warn('Password-reset email failed to send:', err?.message);
      }
    }
    // Convenience for local dev / tests where no email provider is wired up.
    if (!env.isProd) {
      devToken = token;
      if (!emailEnabled() && !env.isTest) {
        // eslint-disable-next-line no-console
        console.log(`\n🔑 Password reset link (dev): ${resetUrl}\n`);
      }
    }
  }

  return ok(
    res,
    { ...(devToken ? { devToken } : {}) },
    'If an account exists for that email, a password reset link is on its way.'
  );
});

/**
 * GET /api/auth/reset-password/:token
 * Pre-flight check so the reset page can show "link expired" up front rather
 * than only after the user fills in a new password.
 */
export const checkResetToken = asyncHandler(async (req, res) => {
  const valid = await isResetTokenValid(req.params.token);
  return ok(res, { valid });
});

/**
 * POST /api/auth/reset-password
 * Consume a valid token and set the new password. Works for Google-only accounts
 * too (it simply adds a password they can then sign in with).
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = resetPasswordSchema.parse(req.body);

  const userId = await consumeResetToken(token);
  if (!userId) {
    throw new AppError(
      'This reset link is invalid or has expired. Please request a new one.',
      400,
      'INVALID_RESET_TOKEN'
    );
  }

  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new AppError('Account not found.', 404, 'USER_NOT_FOUND');

  await user.setPassword(password);
  await user.save();

  return ok(res, {}, 'Your password has been reset. You can sign in now.');
});
