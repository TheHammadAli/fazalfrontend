/** Normalize role entries from API (`"user"` | `{ name: "user" }`). */
export function getRoleNames(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];

  return roles
    .map((role) => {
      if (typeof role === "string") return role.trim().toLowerCase();
      if (role && typeof role === "object" && "name" in role) {
        const name = (role as { name?: unknown }).name;
        return typeof name === "string" ? name.trim().toLowerCase() : "";
      }
      return "";
    })
    .filter(Boolean);
}

/**
 * Admin-only accounts (an admin-tier role, no buyer/seller role) cannot use the customer app.
 * Accounts with a `buyer` or `seller` role may enter even if they also have an admin-tier role
 * (e.g. a regular buyer who was later promoted to admin/moderator on the same email).
 *
 * The backend's role enum is ["buyer","seller","admin","subadmin","super_admin","moderator"] —
 * there is no "user" role. This used to check for "user", which never appears on any account,
 * so `hasUser` was always false and this function returned true for every admin-tier account
 * regardless of whether it also had buyer/seller access — blocking dual-persona accounts from
 * ever signing in to the customer app with their original password.
 */
export function isAdminOnlyAccount(
  userOrRoles: { roles?: unknown } | unknown,
): boolean {
  const roles = getRoleNames(
    userOrRoles &&
      typeof userOrRoles === "object" &&
      "roles" in (userOrRoles as object)
      ? (userOrRoles as { roles?: unknown }).roles
      : userOrRoles,
  );

  if (roles.length === 0) return false;

  const ADMIN_TIER_ROLES = ["admin", "subadmin", "super_admin", "moderator"];
  const CUSTOMER_ROLES = ["buyer", "seller"];

  const hasAdmin = roles.some((role) => ADMIN_TIER_ROLES.includes(role));
  const hasCustomerRole = roles.some((role) => CUSTOMER_ROLES.includes(role));

  return hasAdmin && !hasCustomerRole;
}
