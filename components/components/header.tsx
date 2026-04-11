"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import logo from "@/images/logo.png";
import logo_text from "@/images/logo_text.png";
import { usePathname } from "next/navigation";
import CTAButton from "./cta-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu, X } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";

// Type definitions
interface NavigationItem {
  label: string;
  href: string;
  external?: boolean;
}

interface DropdownItem extends NavigationItem {
  description?: string;
}

interface DropdownSection {
  label: string;
  items: DropdownItem[];
}

interface HeaderProps {
  className?: string;
  hiddenPaths?: string[];
}

interface ScrollState {
  isScrolled: boolean;
  isVisible: boolean;
  lastScrollY: number;
}

// Animation variants
const headerVariants: Variants = {
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { 
      duration: 0.3,
      ease: "easeOut"
    }
  },
  hidden: { 
    y: -100, 
    opacity: 0,
    transition: { 
      duration: 0.3,
      ease: "easeIn"
    }
  }
};

const mobileMenuVariants: Variants = {
  open: {
    opacity: 1,
    height: "auto",
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  closed: {
    opacity: 0,
    height: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

const backdropVariants: Variants = {
  open: {
    opacity: 1,
    transition: { duration: 0.2 }
  },
  closed: {
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// Default paths where header should be completely hidden
const DEFAULT_HIDDEN_PATHS: string[] = [
  '/onboarding',
  '/auth/signin',
  '/auth/signup',
  '/checkout',
  '/payment-success'
];

// const impactDropdown: DropdownSection = {
//   label: "Impact",
//   items: [
//     { label: "Donations", href: "/donations" },
//     { label: "Impact Report", href: "/pledge" }
//   ]
// };

const mainNavigation: NavigationItem[] = [
  { label: "Donate", href: "/pledge" },
  { label: "About", href: "/about" },
  { label: "Projects", href: "/projects" },
  { label: "Ledger", href: "/public-ledger" },
  { label: "Request for help", href: "/report" },
];

/**
 * 
 * Features:
 * - Intelligent sticky behavior (hides when scrolling down, shows when scrolling up)
 * - Configurable path-based hiding (completely hidden on specified routes)
 * - Responsive mobile menu with backdrop blur
 * - Glassmorphism effects when scrolled
 * - Framer Motion animations
 * - Full TypeScript support
 * 
 * @param className - Additional CSS classes to apply to the header
 * @param hiddenPaths - Array of paths where the header should be completely hidden
 */
const Header: React.FC<HeaderProps> = ({ 
  className = "",
  hiddenPaths = DEFAULT_HIDDEN_PATHS 
}) => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [scrollState, setScrollState] = useState<ScrollState>({
    isScrolled: false,
    isVisible: true,
    lastScrollY: 0
  });
  
  const pathname = usePathname();

  // Check if header should be hidden on current path
  const shouldHideHeader: boolean = hiddenPaths.some((path: string) => 
    pathname.startsWith(path)
  );

  // Handle scroll behavior for sticky header
  useEffect(() => {
    if (shouldHideHeader) return;

    const handleScroll = (): void => {
      const currentScrollY: number = window.scrollY;
      
      setScrollState(prevState => {
        const newState: ScrollState = {
          isScrolled: currentScrollY > 20,
          isVisible: prevState.isVisible,
          lastScrollY: currentScrollY
        };

        // Hide/show logic
        if (currentScrollY < 100) {
          // Always show when near top
          newState.isVisible = true;
        } else if (currentScrollY > prevState.lastScrollY && currentScrollY > 100) {
          // Hide when scrolling down
          newState.isVisible = false;
          setMobileMenuOpen(false); // Close mobile menu when hiding
        } else if (currentScrollY < prevState.lastScrollY) {
          // Show when scrolling up
          newState.isVisible = true;
        }

        return newState;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [shouldHideHeader]);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    console.log('banger')
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Toggle mobile menu handler
  const handleMobileMenuToggle = (): void => {
    setMobileMenuOpen(prev => !prev);
  };

  // Close mobile menu handler
  const handleMobileMenuClose = (): void => {
    setMobileMenuOpen(false);
  };

  // Don't render header on hidden paths
  if (shouldHideHeader) {
    return null;
  }

  return (
    <>
      <motion.header
        variants={headerVariants}
        animate={scrollState.isVisible ? "visible" : "hidden"}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrollState.isScrolled 
            ? 'bg-white/80 backdrop-blur-md border-b border-theme-100/50 shadow-sm' 
            : 'bg-transparent'
        } ${className}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
            
            {/* Logo */}
            <Link 
              href="/" 
              className="flex items-center space-x-3 group transition-transform duration-200 hover:scale-105"
            >
              <div className="relative">
                <Image
                  src={logo}
                  alt="MORRIS MONYE logo"
                  width={40}
                  height={40}
                  className="transition-transform duration-200 group-hover:rotate-3"
                />
              </div>
              <div className="hidden sm:block">
                <Image
                  src={logo_text}
                  alt="MORRIS MONYE"
                  width={90}
                  height={24}
                  className="transition-opacity duration-200 group-hover:opacity-80"
                />
              </div>
            </Link>

            {/* Centered Desktop Navigation */}
            <nav className="hidden lg:flex items-center justify-center flex-1 mx-8">
              <div className="flex items-center space-x-1">
                {mainNavigation.map((item: NavigationItem) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-4 py-2 text-sm font-medium text-theme-700 hover:text-theme-900 hover:bg-theme-50 rounded-lg transition-all duration-200"
                    {...(item.external && { target: "_blank", rel: "noopener noreferrer" })}
                  >
                    {item.label}
                  </Link>
                ))}

                {/* <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center px-4 py-2 text-sm font-medium text-theme-700 hover:text-theme-900 hover:bg-theme-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-theme-200">
                    {impactDropdown.label}
                    <ChevronDown className="ml-1 w-4 h-4 transition-transform duration-200 group-hover:rotate-180" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48 bg-white/95 backdrop-blur-md border border-theme-100 shadow-lg rounded-xl">
                    {impactDropdown.items.map((item: DropdownItem) => (
                      <DropdownMenuItem key={item.href} asChild className="hover:bg-theme-50 rounded-lg mx-1">
                        <Link 
                          href={item.href} 
                          className="w-full px-3 py-2"
                          {...(item.external && { target: "_blank", rel: "noopener noreferrer" })}
                        >
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu> */}
              </div>
            </nav>

            {/* Fixed Desktop Auth Area */}
            <div className="hidden lg:flex items-center space-x-3 min-w-[200px] justify-end">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="px-4 py-2 text-sm font-medium text-theme-700 hover:text-theme-900 hover:bg-theme-50 rounded-lg transition-all duration-200">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="bg-theme-500 hover:bg-theme-600 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md">
                    Join
                  </button>
                </SignUpButton>
              </SignedOut>

              <SignedIn>
                <CTAButton
                  href={pathname === "/dashboard" ? "/" : "/dashboard"}
                  className="!text-sm !w-auto flex items-center"
                >
                  {pathname === "/dashboard" ? "Home" : "Dashboard"}
                </CTAButton>
                <div className="ml-2">
                  <UserButton 
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8"
                      }
                    }}
                  />
                </div>
              </SignedIn>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={handleMobileMenuToggle}
              className="lg:hidden p-2 rounded-lg text-theme-700 hover:text-theme-900 hover:bg-theme-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-theme-200 relative z-60"
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={handleMobileMenuClose}
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            variants={mobileMenuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed top-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur-md border-b border-theme-100 shadow-lg"
            style={{ paddingTop: '80px' }}
          >
            {/* Mobile Menu Button */}
            <button
              onClick={handleMobileMenuToggle}
              className="absolute right-4 top-4 sm:right-6 lg:right-8 lg:hidden p-2 rounded-lg text-theme-700 hover:text-theme-900 hover:bg-theme-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-theme-200 z-60"
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            ><X className="w-6 h-6" />
            </button>
            <div className="px-4 py-6 space-y-2 max-h-[calc(100vh-80px)] overflow-y-auto">
              {/* Main Navigation Links */}
              {mainNavigation.map((item: NavigationItem) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-4 py-3 text-base font-medium text-theme-700 hover:text-theme-900 hover:bg-theme-50 rounded-lg transition-all duration-200"
                  onClick={handleMobileMenuClose}
                  {...(item.external && { target: "_blank", rel: "noopener noreferrer" })}
                >
                  {item.label}
                </Link>
              ))}

              {/* Impact Section - Collapsible */}
              {/* <div className="space-y-1">
                <details className="group">
                  <summary className="flex items-center justify-between px-4 py-3 text-base font-medium text-theme-700 hover:text-theme-900 hover:bg-theme-50 rounded-lg transition-all duration-200 cursor-pointer list-none">
                    <span>{impactDropdown.label}</span>
                    <ChevronDown className="w-4 h-4 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="mt-1 ml-4 space-y-1">
                    {impactDropdown.items.map((item: DropdownItem) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2 text-sm font-medium text-theme-600 hover:text-theme-900 hover:bg-theme-50 rounded-lg transition-all duration-200"
                        onClick={handleMobileMenuClose}
                        {...(item.external && { target: "_blank", rel: "noopener noreferrer" })}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </details>
              </div> */}

              {/* Auth Section */}
              <div className="pt-4 border-t border-theme-100 mt-6 space-y-2">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="block w-full text-left px-4 py-3 text-base font-medium text-theme-700 hover:text-theme-900 hover:bg-theme-50 rounded-lg transition-all duration-200">
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="w-full bg-theme-500 hover:bg-theme-600 text-white px-4 py-3 rounded-lg text-base font-semibold transition-all duration-200 shadow-sm">
                      Join
                    </button>
                  </SignUpButton>
                </SignedOut>

                <SignedIn>
                  <Link
                    href="/dashboard"
                    className="flex px-4 py-3 text-base font-medium text-center items-center text-theme-700 hover:text-theme-900 hover:bg-theme-50 rounded-lg transition-all duration-200"
                    onClick={handleMobileMenuClose}
                  >
                    Dashboard
                  </Link>
                  <div className="px-4 py-2">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </SignedIn>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer to prevent content jump */}
      <div className="h-20" />
    </>
  );
};

export default Header;
