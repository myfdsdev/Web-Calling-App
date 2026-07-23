import { ZodError } from 'zod';
import { AppError } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found.', code: 'NOT_FOUND' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Zod validation errors → readable 422
  if (err instanceof ZodError) {
    const first = err.errors[0];
    return res.status(422).json({
      success: false,
      message: first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'Invalid input.',
      code: 'VALIDATION_ERROR',
      errors: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  // Mongoose duplicate key
  if (err && err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'That record already exists.',
      code: 'DUPLICATE',
    });
  }

  // Mongoose cast error (bad ObjectId)
  if (err && err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid identifier.', code: 'BAD_ID' });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, message: err.message, code: err.code });
  }

  if (!env.isTest) {
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', err);
  }

  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred.',
    code: 'INTERNAL_ERROR',
    ...(env.isProd ? {} : { detail: String(err && err.message ? err.message : err) }),
  });
}
