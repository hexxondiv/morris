"use client";

import { signIn, signOut, SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import type { Role } from "@/types/database.types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthorized } from "./utils";

export function AuthSessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}

export async function getUserRoleClient(_userId?: string): Promise<Role | null> {
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    if (!response.ok) return null;
    const session = await response.json();
    return (session?.user?.role as Role) || null;
  } catch {
    return null;
  }
}

export function useCurrentSession() {
  return useSession();
}

export function useCurrentUser() {
  return useSession().data?.user ?? null;
}

export function useCurrentRole(): Role {
  return (useSession().data?.user?.role as Role) || "user";
}

export async function signInWithGoogle(callbackUrl = "/dashboard") {
  await signIn("google", { callbackUrl });
}

export async function signOutTo(callbackUrl = "/") {
  await signOut({ callbackUrl });
}

export function useEnsureAuthorized(requiredRole: Role) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isUserAuthorized, setIsUserAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuthorization() {
      setIsLoading(true);
      if (status === "loading") return;

      if (!session?.user?.id) {
        const currentPath = searchParams?.toString()
          ? `${pathname}?${searchParams.toString()}`
          : pathname;
        router.push(`/sign-in?callbackUrl=${encodeURIComponent(currentPath || "/dashboard")}`);
        setIsLoading(false);
        return;
      }

      const userRole = session.user.role;
      if (!userRole || !isAuthorized(userRole, requiredRole)) {
        router.push("/unauthorized");
        setIsLoading(false);
        return;
      }

      setIsUserAuthorized(true);
      setIsLoading(false);
    }

    checkAuthorization();
  }, [pathname, requiredRole, router, searchParams, session, status]);

  return { isLoading, isUserAuthorized };
}
