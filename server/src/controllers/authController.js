import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { ok, fail, AppError } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { registerSchema, loginSchema } from '../validators/agentValidator.js';

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

  const valid = await user.verifyPassword(password);
  if (!valid) return fail(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');

  const token = signToken(user._id);
  return ok(res, { token, user: user.toPublic() }, 'Signed in.');
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return fail(res, 'User not found.', 404, 'USER_NOT_FOUND');
  return ok(res, { user: user.toPublic() });
});
