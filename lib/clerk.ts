import { cookies } from "next/headers";
import { Role } from '@/types/database.types';
import { auth } from '@clerk/nextjs/server';
import { getUserRoleFromClerk } from "./actions";
import { isAuthorized } from "./utils";

export async function getCookieHeader() {
  const store = await cookies();
  return store.getAll().map(c => `${c.name}=${c.value}`).join("; ");
}

export async function requireRole(requiredRole: Role) {
  const { userId } = await auth();
  
  if (!userId) {
    return { authorized: false, response: new Response('Unauthorized', { status: 401 }) };
  }
  
  const userRole = await getUserRoleFromClerk(userId);
  const authorized = isAuthorized(userRole, requiredRole);
  
  if (!authorized) {
    return { authorized: false, response: new Response('Forbidden', { status: 403 }) };
  }
  
  return { authorized: true, userId, userRole };
}

/**
 * Retrieves the user role from Clerk's publicMetadata without extra API calls.
 * @param request - The Next.js request object to get the authenticated session.
 * @returns The user's role or the default role ('user') if not found or unauthenticated.
 * @throws Error if authentication fails or user data is inaccessible.
 */
