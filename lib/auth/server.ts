import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import type { Role } from "@/types/database.types";
import { authOptions } from "@/lib/auth/options";
import { isAuthorized } from "@/lib/utils";
import { prisma } from "@/lib/db/prisma";
import { normalizeRole } from "@/lib/auth/roles";

export type AuthSuccess = {
  authorized: true;
  session: Session;
  userId: string;
  userRole: Role;
};

export type AuthFailure = {
  authorized: false;
  response: Response;
};

export type RequireAuthResult = AuthSuccess | AuthFailure;

export async function getCookieHeader() {
  const store = await cookies();
  return store.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
}

export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

/**
 * Loads the signed-in internal user row (including role assignments).
 * Role checks for sensitive operations should still use `requireRole` or
 * compare against `getPrimaryRole` when the DB is source of truth.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      userRoles: {
        include: {
          role: { select: { key: true } },
        },
      },
    },
  });
}

export async function requireAuth(): Promise<RequireAuthResult> {
  const session = await getSession();

  if (!session?.user?.id) {
    return {
      authorized: false,
      response: new Response("Unauthorized", { status: 401 }),
    };
  }

  const userRole = normalizeRole(session.user.role);

  return {
    authorized: true,
    session,
    userId: session.user.id,
    userRole,
  };
}

export async function requireRole(requiredRole: Role): Promise<RequireAuthResult> {
  const auth = await requireAuth();

  if (!auth.authorized) {
    return auth;
  }

  if (!isAuthorized(auth.userRole, requiredRole)) {
    return {
      authorized: false,
      response: new Response("Forbidden", { status: 403 }),
    };
  }

  return auth;
}

export { isAuthorized } from "@/lib/utils";
