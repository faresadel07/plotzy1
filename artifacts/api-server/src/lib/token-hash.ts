import crypto from "node:crypto";

/**
 * Hash a token for at-rest storage. Used by:
 *   - password_reset_tokens.token
 *   - email_verification_tokens.token
 *   - book_collaborators.invite_code
 *
 * SHA-256 (not bcrypt) because the inputs here are either high-entropy
 * random hex tokens (32 bytes from crypto.randomBytes) or short
 * user-typeable codes whose brute-force attack happens against the
 * live API (rate-limited by sensitiveAuthLimiter), not against the
 * stored hash. bcrypt's slow-hash buys nothing in either scenario and
 * adds ~100ms per verification.
 *
 * Hashing at rest defends against DB compromise: an attacker who
 * exfiltrates the table sees only hashes and cannot replay them
 * because every flow re-hashes the incoming value before lookup.
 *
 * The lookup pattern is `WHERE token = $hashed_input` against an
 * indexed UNIQUE column. The index leaf comparison is on full-entropy
 * hash bytes, so timing leaks reveal nothing useful about the original
 * token (an attacker would have to invert SHA-256 to construct a
 * colliding input).
 */
export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
