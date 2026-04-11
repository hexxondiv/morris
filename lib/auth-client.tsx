"use client";

import { Role } from "@/types/database.types";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthorized } from "./utils";
import SwitchAppCheckout from "@switchappgo/switchapp-inline";

export async function getUserRoleClient(userId: string): Promise<Role | null> {
  try {
    const response = await fetch(`/api/users/${userId}/role`);
    if (!response.ok) return null;
    const { role } = await response.json();
    return role as Role;
  } catch {
    return null;
  }
}

export function useEnsureAuthorized(requiredRole: Role) {
  const { userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isUserAuthorized, setIsUserAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuthorization() {
      setIsLoading(true);
      if (!userId) {
        router.push("/sign-in");
        setIsLoading(false);
        return;
      }

      if (!user) return;

      const userRole = await getUserRoleClient(userId);
      if (!userRole || !isAuthorized(userRole, requiredRole)) {
        router.push("/unauthorized");
        setIsLoading(false);
        return;
      }

      setIsUserAuthorized(true);
      setIsLoading(false);
    }

    checkAuthorization();
  }, [userId, user, requiredRole, router]);

  return { isLoading, isUserAuthorized };
}
