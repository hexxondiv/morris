"use client";

// Admin gate: `session.user` and `useCurrentRole()` come from Auth.js; role is resolved from Prisma in the session callback (workstream 03/04).

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { isAuthorized } from "@/lib/utils";
import { Role } from "@/types/database.types";
import LogoLoader from "@/components/components/logo-loader";
import { useSettingsStore } from "@/app/stores/settings";
import { useCurrentRole, useCurrentSession } from "@/lib/auth-client";

interface AdminLayoutProps {
  children: React.ReactNode;
}
const REQUIRED_ROLE: Role = "editor";

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useCurrentSession();
  const userRole = useCurrentRole();
  const router = useRouter();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const { fetchSettings, fetchCategories } = useSettingsStore();

  useEffect(() => {
    // Fetch admin settings when entering admin area
    fetchSettings();
    fetchCategories();
  }, [fetchSettings, fetchCategories]);

  const isUserAuthorized = useMemo(() => {
    return session?.user ? isAuthorized(userRole, REQUIRED_ROLE) : false;
  }, [session?.user, userRole]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/sign-in");
      return;
    }

    if (!isUserAuthorized) {
      router.replace("/unauthorized");
      return;
    }

    setHasCheckedAuth(true);
  }, [isUserAuthorized, router, session?.user, status]);

  if (status === "loading") return <LogoLoader />;
  if (!session?.user || !isUserAuthorized || !hasCheckedAuth) return <LogoLoader />;

  return <div className="min-h-screen w-full">{children}</div>;
}
