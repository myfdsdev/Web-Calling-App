import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { fail } from '../utils/apiResponse.js';

/**
 * Require a valid JWT. Attaches { id } to req.user.
 * Ownership everywhere is derived from this token — never from the request body.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return fail(res, 'Authentication required.', 401, 'UNAUTHENTICATED');
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub };
    return next();
  } catch {
    return fail(res, 'Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
  }
}

export function signToken(userId) {
  return jwt.sign({ sub: userId.toString() }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}
