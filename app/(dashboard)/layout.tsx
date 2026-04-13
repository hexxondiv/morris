"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  Folder,
  DollarSign,
  LogOut,
  User,
  Calendar,
  Menu,
  Settings,
  PiggyBank,
  Heart,
  CircleArrowOutUpRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { usePageHeader } from "../store";
import LogoLoader from "@/components/components/logo-loader";
import { Role } from "@/types/database.types";
import { Variants } from "framer-motion";
import { signOutTo, useCurrentSession } from "@/lib/auth-client";

// Navigation configuration
const NAVIGATION_CONFIG = {
  dashboard: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
    { href: "/dashboard/account", icon: User, label: "Account" },
    { href: "/dashboard/projects", icon: Folder, label: "Projects" },
    // { href: "/dashboard/voting", icon: Vote, label: "Voting" },
  ],
  admin: [
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/projects", icon: Folder, label: "Projects" },
    // { href: "/admin/cases", icon: FileText, label: "Cases" },
    { href: "/admin/transactions", icon: PiggyBank, label: "Transactions" },
    { href: "/admin/outflow", icon: CircleArrowOutUpRight, label: "Outflow" },
    { href: "/admin/pledges", icon: Heart, label: "Pledges" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ],
} as const;

// Page titles mapping
const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard Overview",
  "/dashboard/account": "Account Settings",
  "/dashboard/events": "Events",
  "/dashboard/voting": "Voting",
  "/admin/users": "User Management",
  "/admin/projects": "Project Management",
  "/admin/cases": "Case Management",
  "/admin/pledges": "Pledge Management",
  "/admin/transactions": "Transactions Management",
  "/admin/outflow": "Outflow Management",
};

interface NavItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  isSidebarOpen: boolean;
}

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
  isSidebarOpen,
}: NavItemProps) {
  return (
    <CommandItem
      className={`flex items-center p-2 rounded-md transition-colors ${
        isActive ? "bg-theme-100 text-theme-600" : "hover:bg-theme-100"
      }`}
    >
      <Icon className="h-4 w-4 mr-3 text-theme-500 flex-shrink-0" />
      {isSidebarOpen && (
        <Link
          href={href}
          className="text-sm font-medium hover:text-theme-600 flex-1"
        >
          {label}
        </Link>
      )}
    </CommandItem>
  );
}

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-stone-900">
      {children}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Start closed on mobile
  const [isMobile, setIsMobile] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const router = useRouter();
  const { data: session, status } = useCurrentSession();
  const pathname = usePathname();
  const setHeader = usePageHeader((state) => state.setHeader);

  // Memoize user role and admin status
  const userRole = useMemo(() => {
    return (session?.user?.role as Role) || "user";
  }, [session?.user?.role]);

  const isAdmin = useMemo(() => {
    return userRole !== "user";
  }, [userRole]);

  // Memoize page title
  const pageTitle = useMemo(() => {
    // Scroll to top on route change
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }

    return PAGE_TITLES[pathname] || "Dashboard";
  }, [pathname]);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile); // Open on desktop, closed on mobile
    };

    handleResize(); // Set initial state
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle authentication and routing
  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user?.id) {
      router.replace(`/sign-in?callbackUrl=${encodeURIComponent(pathname || "/dashboard")}`);
      return;
    }

    // Redirect authenticated users away from sign-in page
    if (pathname === "/sign-in") {
      router.replace("/dashboard");
      return;
    }

    setHasCheckedAuth(true);
  }, [pathname, router, session?.user?.id, status]);

  // Auto-close sidebar on route change for mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  // Update page header
  useEffect(() => {
    setHeader(pageTitle);
  }, [pageTitle, setHeader]);

  // Sidebar animation variants
  const sidebarVariants: Variants = {
    open: {
      width: "16rem",
      x: 0,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    closed: {
      width: "3.5rem",
      x: 0,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    mobileOpen: {
      x: 0,
      width: "16rem",
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    mobileClosed: {
      x: "-100%",
      width: "16rem",
      transition: { duration: 0.3, ease: "easeInOut" },
    },
  };

  // Show loader while checking authentication
  if (status === "loading" || !hasCheckedAuth) {
    return <LogoLoader />;
  }

  return (
    <ProtectedLayout>
      <div className="flex min-h-screen">
        {/* Mobile Menu Button */}
        <button
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-full bg-theme-500 text-white hover:bg-theme-600 transition-colors shadow-lg"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mobile Backdrop */}
        {isSidebarOpen && isMobile && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <motion.aside
          className="fixed inset-y-0 left-0 bg-theme-50 text-theme-900 z-40 border-r border-stone-100 h-full"
          initial={!isMobile ? "open" : "mobileClosed"}
          animate={
            isSidebarOpen
              ? !isMobile
                ? "open"
                : "mobileOpen"
              : !isMobile
              ? "closed"
              : "mobileClosed"
          }
          variants={sidebarVariants}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center p-4 hover:bg-theme-100 transition-colors"
              onClick={() => isMobile && setIsSidebarOpen(false)}
            >
              <div className="flex items-center justify-center min-w-0">
                <Image
                  src="/logo.png"
                  alt="MORRIS MONYE"
                  width={512}
                  height={512}
                  priority
                  className={
                    isSidebarOpen
                      ? "object-contain h-11 w-auto max-w-[min(100%,200px)]"
                      : "object-contain h-9 w-9 rounded-full"
                  }
                />
              </div>
            </Link>

            {/* Navigation */}
            <Command className="flex-1 rounded-none">
              <CommandList className="p-2 max-h-none">
                {/* Dashboard Navigation */}
                <CommandGroup className="text-stone-500 text-xs font-medium">
                  {isSidebarOpen && <span>Dashboard</span>}
                  {NAVIGATION_CONFIG.dashboard.map((item) => (
                    <div
                      key={item.href}
                      onClick={() => isMobile && setIsSidebarOpen(false)}
                    >
                      <NavItem
                        href={item.href}
                        icon={item.icon}
                        label={item.label}
                        isActive={
                          pathname === item.href ||
                          (item.href !== "/dashboard" &&
                            pathname.startsWith(item.href))
                        }
                        isSidebarOpen={isSidebarOpen}
                      />
                    </div>
                  ))}
                </CommandGroup>

                {/* Admin Navigation */}
                {isAdmin && (
                  <CommandGroup className="text-stone-500 text-xs font-medium mt-4">
                    {isSidebarOpen && <span>Admin</span>}
                    {NAVIGATION_CONFIG.admin.map((item) => (
                      <div
                        key={item.href}
                        onClick={() => isMobile && setIsSidebarOpen(false)}
                      >
                        <NavItem
                          href={item.href}
                          icon={item.icon}
                          label={item.label}
                          isActive={
                            pathname === item.href ||
                            pathname.startsWith(item.href)
                          }
                          isSidebarOpen={isSidebarOpen}
                        />
                      </div>
                    ))}
                  </CommandGroup>
                )}

                {/* Account Actions */}
                <CommandGroup className="text-stone-500 text-xs font-medium mt-4">
                  {isSidebarOpen && <span>Account</span>}
                  <CommandItem className="flex items-center p-2 rounded-md transition-colors hover:bg-theme-100">
                    <LogOut className="h-4 w-4 mr-3 text-coral-500 flex-shrink-0" />
                    {isSidebarOpen && (
                      <button
                        className="text-sm font-medium hover:text-coral-600 text-left w-full"
                        onClick={() => signOutTo("/sign-in")}
                      >
                        Sign Out
                      </button>
                    )}
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </motion.aside>

        {/* Main Content */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ${
            !isMobile ? (isSidebarOpen ? "lg:pl-64" : "lg:pl-14") : ""
          }`}
        >
          {/* Header */}
          <header className="bg-white border-b border-stone-100 p-4 sticky top-0 z-30 shadow-sm">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-medium text-theme-900 ml-12 lg:ml-0">
                {pageTitle}
              </h1>

              {/* User info - could be expanded */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-stone-600 hidden sm:inline">
                  {session?.user?.firstName || session?.user?.lastName
                    ? `${session?.user?.firstName ?? ""} ${session?.user?.lastName ?? ""}`.trim()
                    : session?.user?.name}
                </span>
                <div className="w-8 h-8 bg-theme-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-theme-600">
                    {(session?.user?.firstName || session?.user?.name || "?").charAt(0)}
                    {(session?.user?.lastName || "").charAt(0)}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 bg-[hsl(var(--background))]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-theme-50 to-theme-100 min-h-full p-1 sm:p-4 md:p-6 lg:p-8 overflow-x-clip"
            >
              <div className="max-w-7xl mx-auto space-y-6">{children}</div>
            </motion.div>
          </main>
        </div>
      </div>
    </ProtectedLayout>
  );
}
