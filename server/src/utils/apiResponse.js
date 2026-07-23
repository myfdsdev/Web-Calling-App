/** Standard success envelope: { success, message, data }. */
export function ok(res, data = {}, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

/** Standard error envelope: { success, message, code }. */
export function fail(res, message = 'Something went wrong', status = 400, code = 'ERROR', extra = {}) {
  return res.status(status).json({ success: false, message, code, ...extra });
}

/** Application error carrying an HTTP status + stable error code. */
export class AppError extends Error {
  constructor(message, status = 400, code = 'ERROR') {
    super(message);
    this.status = status;
    this.code = code;
    this.isOperational = true;
  }
}
