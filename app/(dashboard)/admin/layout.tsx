"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { isAuthorized } from "@/lib/utils";
import { Role } from "@/types/database.types";
import LogoLoader from "@/components/components/logo-loader";
import { useSettingsStore } from "@/app/stores/settings";

interface AdminLayoutProps {
  children: React.ReactNode;
}
const REQUIRED_ROLE: Role = "editor";

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const { fetchSettings, fetchCategories } = useSettingsStore();

  useEffect(() => {
    // Fetch admin settings when entering admin area
    fetchSettings();
    fetchCategories();
  }, [fetchSettings, fetchCategories]);

  const userRole = useMemo(() => {
    return (user?.publicMetadata?.role as Role) || "user";
  }, [user?.publicMetadata?.role]);

  const isUserAuthorized = useMemo(() => {
    return user ? isAuthorized(userRole, REQUIRED_ROLE) : false;
  }, [user, userRole]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push("/sign-in");
      return;
    }

    if (!isUserAuthorized) {
      router.replace("/unauthorized");
      return;
    }

    setHasCheckedAuth(true);
  }, [isLoaded, user, isUserAuthorized, router]);

  if (!isLoaded) return <LogoLoader />;
  if (!user || !isUserAuthorized || !hasCheckedAuth) return <LogoLoader />;

  return <div className="min-h-screen w-full">{children}</div>;
}
