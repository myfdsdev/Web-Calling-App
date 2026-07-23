import crypto from 'crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** URL-safe, hard-to-guess short id for public share links (e.g. "k3f9a2b7q1"). */
export function genPublicId(length = 10) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
