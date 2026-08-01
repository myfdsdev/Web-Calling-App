import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { fail } from '../utils/apiResponse.js';
import { User } from '../models/User.js';

/**
 * Require a valid JWT. Attaches { id } to req.user.
 * Ownership everywhere is derived from this token — never from the request body.
 *
 * The token carries a `tv` (tokenVersion) claim; we re-check it against the user
 * so a password reset (which bumps tokenVersion) instantly invalidates every
 * token issued before it. Tokens minted before this claim existed carry no `tv`
 * and default to 0, matching a fresh account — so a deploy never logs anyone out.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return fail(res, 'Authentication required.', 401, 'UNAUTHENTICATED');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return fail(res, 'Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
  }

  try {
    // Lean lookup: only the version field is needed to validate the session.
    const user = await User.findById(payload.sub).select('tokenVersion');
    if (!user) {
      return fail(res, 'Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
    }
    if ((payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      return fail(res, 'Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
    }
    req.user = { id: payload.sub };
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Sign a session token for a user doc, stamping its current tokenVersion. */
export function signToken(user) {
  const id = (user?._id || user?.id || user).toString();
  const tv = user?.tokenVersion ?? 0;
  return jwt.sign({ sub: id, tv }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}
