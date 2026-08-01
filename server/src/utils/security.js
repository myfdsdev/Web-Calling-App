import crypto from 'crypto';

/**
 * Length-safe constant-time string comparison. `a === b` leaks length and the
 * first differing byte through timing, so it must never guard a shared secret.
 * Returns false for any non-string or length mismatch without an early-out that
 * a clock could observe.
 */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  // timingSafeEqual throws on length mismatch — hash both to a fixed width first
  // so the comparison itself never reveals whether the lengths differed.
  const ah = crypto.createHash('sha256').update(ab).digest();
  const bh = crypto.createHash('sha256').update(bb).digest();
  return crypto.timingSafeEqual(ah, bh) && ab.length === bb.length;
}

/** SHA-256 hex digest — used to store reset/invite tokens without the raw value. */
export function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

/** A URL-safe random token (raw value; store only its sha256Hex). */
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

// Ambiguous glyphs a human would mistype off an email are excluded on purpose
// (no 0/O, 1/l/I). The set still yields ~5.5 bits/char over 16 chars ≈ 88 bits.
const PW_UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const PW_LOWER = 'abcdefghijkmnpqrstuvwxyz';
const PW_DIGIT = '23456789';
const PW_SYMBOL = '@#$%*+=?';
const PW_ALL = PW_UPPER + PW_LOWER + PW_DIGIT + PW_SYMBOL;

function pick(alphabet) {
  // Rejection sampling keeps the distribution uniform (no modulo bias).
  const max = 256 - (256 % alphabet.length);
  let byte;
  do {
    byte = crypto.randomBytes(1)[0];
  } while (byte >= max);
  return alphabet[byte % alphabet.length];
}

/**
 * Generate a temporary password a person can retype from an email. Guarantees at
 * least one of each class so it satisfies common policies, then fills the rest
 * from the full (unambiguous) alphabet and shuffles.
 */
export function generatePassword(length = 16) {
  const len = Math.max(12, length);
  const chars = [pick(PW_UPPER), pick(PW_LOWER), pick(PW_DIGIT), pick(PW_SYMBOL)];
  while (chars.length < len) chars.push(pick(PW_ALL));
  // Fisher–Yates with a fresh random index so the guaranteed chars aren't fixed
  // at the front.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
