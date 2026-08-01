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
import {
  requestPasswordReset,
  completePasswordReset,
} from '../services/auth/passwordResetService.js';
import { env, googleAuthEnabled } from '../config/env.js';

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

  const token = signToken(user);
  return ok(res, { token, user: user.toPublic() }, 'Account created.', 201);
});

/**
 * POST /api/auth/register-admin
 * Self-serve signup that provisions the account on the "Admin" plan, so the new
 * user immediately owns a workspace they can invite users into and manage.
 */
export const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);

  const existing = await User.findOne({ email });
  if (existing) throw new AppError('An account with that email already exists.', 409, 'EMAIL_TAKEN');

  const user = new User({ name, email, plan: 'admin' });
  await user.setPassword(password);
  await user.save();

  const token = signToken(user);
  return ok(res, { token, user: user.toPublic() }, 'Admin account created.', 201);
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

  const token = signToken(user);
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

  const token = signToken(user);
  return ok(res, { token, user: user.toPublic() }, 'Signed in with Google.');
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return fail(res, 'User not found.', 404, 'USER_NOT_FOUND');
  return ok(res, { user: user.toPublic() });
});

/**
 * POST /api/auth/forgot-password { email }
 * Always returns the SAME 200 + message whether or not the address exists — the
 * response must never reveal which emails have accounts. `sent` is deliberately
 * NOT surfaced. In non-production a devLink is included only when no mail provider
 * is configured, so local development can still complete the flow.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const { devLink } = await requestPasswordReset(email);
  const message = 'If an account exists for that email, a reset link is on its way.';
  return ok(res, devLink ? { devLink } : {}, message);
});

/**
 * POST /api/auth/reset-password { token, password }
 * Expired, spent and fabricated tokens all return the same error.
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = resetPasswordSchema.parse(req.body);
  await completePasswordReset(token, password);
  return ok(res, {}, 'Your password has been reset. Please sign in.');
});
