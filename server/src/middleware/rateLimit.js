import { env } from '../config/env.js';
import { fail } from '../utils/apiResponse.js';

/**
 * Minimal in-memory fixed-window rate limiter. Enough to blunt an email bomber on
 * /forgot-password and a token brute-force on /reset-password from a single
 * instance. If you run multiple instances, move the counter to a shared store
 * (Redis). Disabled under test so the suite stays deterministic.
 *
 * @param {object}   opts
 * @param {number}   opts.windowMs  window length
 * @param {number}   opts.max       allowed requests per key per window
 * @param {function} [opts.key]     (req) => string; defaults to the client IP
 */
export function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, key } = {}) {
  const hits = new Map(); // id -> { count, resetAt }

  return function limiter(req, res, next) {
    if (env.isTest) return next();

    const now = Date.now();
    const id = (key ? key(req) : req.ip) || 'unknown';
    let entry = hits.get(id);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(id, entry);
    }
    entry.count += 1;

    // Opportunistic sweep so the map can't grow unbounded on a long-lived process.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return fail(res, 'Too many requests. Please try again in a little while.', 429, 'RATE_LIMITED');
    }
    return next();
  };
}
