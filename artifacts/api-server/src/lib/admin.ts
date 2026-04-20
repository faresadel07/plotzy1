/**
 * Single source of truth for "is this user an admin?".
 *
 * The DB `role` column is authoritative. The ADMIN_EMAIL env var is a
 * dev-only / initial-bootstrap fallback so a brand-new deployment with no
 * admin row yet can still promote the first operator. In production we do
 * NOT trust ADMIN_EMAIL — once the app is live, admin-ness must come from
 * the DB (set via a migration or the admin panel), not from an environment
 * variable an attacker could match by creating an account with that email.
 */
export function isAdminUser(user: unknown): boolean {
  if (!user || typeof user !== "object") return false;
  const u = user as { role?: unknown; email?: unknown };
  if (u.role === "admin") return true;
  if (process.env.NODE_ENV !== "production") {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && typeof u.email === "string" && u.email === adminEmail) return true;
  }
  return false;
}
