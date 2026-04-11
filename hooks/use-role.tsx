"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import type { Role } from "@/types/database.types";
import { normalizeRole } from "@/lib/auth/roles";
import { useCurrentRole } from "@/lib/auth-client";

/**
 * Client-side role from the Auth.js session (`useCurrentRole` + `useSession` status).
 * Not sufficient for sensitive authorization; server routes must call `requireRole` / DB checks.
 */
export function useUserRole(defaultRole: Role = "user"): Role {
  const { status } = useSession();
  const role = useCurrentRole();

  return useMemo(() => {
    if (status === "unauthenticated") return defaultRole;
    return normalizeRole(role);
  }, [status, role, defaultRole]);
}
