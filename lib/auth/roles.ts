import type { Role } from "@/types/database.types";

const knownRoles: Role[] = [
  "user",
  "editor",
  "moderator",
  "admin",
  "super_admin",
];

export function normalizeRole(role?: string | null): Role {
  if (!role) return "user";
  return knownRoles.includes(role as Role) ? (role as Role) : "user";
}

export function getPrimaryRole(
  userRoles: Array<{ role: { key: string }; expiresAt: Date | null }>
): Role {
  const activeRoles = userRoles
    .filter(({ expiresAt }) => !expiresAt || expiresAt > new Date())
    .map(({ role }) => normalizeRole(role.key));

  if (activeRoles.includes("super_admin")) return "super_admin";
  if (activeRoles.includes("admin")) return "admin";
  if (activeRoles.includes("moderator")) return "moderator";
  if (activeRoles.includes("editor")) return "editor";
  return "user";
}
