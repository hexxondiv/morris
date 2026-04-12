"use client";

import Image from "next/image";
import Link from "next/link";
import left from "../../images/book_left.png";
import right from "../../images/book_right.png";
import CTAButton from "./cta-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Instagram, ExternalLink } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import educareLogo from "../../images/educare.png";

interface FooterProps {
  className?: string;
  hiddenPaths?: string[];
}
// Default paths where header should be completely hidden
const DEFAULT_HIDDEN_PATHS: string[] = ["/payment-success", "/maintenance"];

const Footer: React.FC<FooterProps> = ({
  className = "",
  hiddenPaths = DEFAULT_HIDDEN_PATHS,
}) => {
  const pathname = usePathname();

  // Check if footer should be hidden on current path
  const shouldHideFooter: boolean = hiddenPaths.some((path: string) =>
    pathname.startsWith(path)
  );

  // Handle scroll behavior for sticky header
  useEffect(() => {
    if (shouldHideFooter) return;
  }, [shouldHideFooter]);

  // ADD THIS: Early return if footer should be hidden
  if (shouldHideFooter) {
    return null;
  }

  const footerSections = [
    {
      title: "Get involved",
      links: [
        { href: "/sign-in", label: "Join the village", external: false },
        { href: "/pledge", label: "Make a one-time gift" },
        // { href: "/blog", label: "Our blog" },
        { href: "/#faqs", label: "FAQs" },
      ],
    },
    {
      title: "Impact",
      links: [
        { href: "/projects", label: "Projects" },
        { href: "/donations", label: "Donations" },
        // { href: "/reports/q1-2025", label: "Impact report" },
      ],
    },
    {
      title: "About & Legal",
      links: [
        { href: "/about", label: "How MORRIS MONYE works" },
        // { href: "/finances", label: "Financial ledger" },
        // { href: "/terms", label: "Terms of service" },
        // { href: "/privacy", label: "Privacy policy" },
      ],
    },
  ];

  return (
    <footer className="bg-theme-50">
      {/* CTA Section */}
      <div className="pb-8 sm:pb-12 border-b border-theme-200">
        <div className="container px-8 mx-auto max-w-2xl">
          <div className="mx-auto max-w-2xl space-y-10 text-center">
            {/* Footsteps */}
            <div className="gap-1 py-2">
              {[...Array(2)].map((_, i) => (
                <span
                  key={`steps-${i}`}
                  className="flex space-x-4 justify-center"
                >
                  <div key={`l-${i}`} className="text-right">
                    <Image
                      src={left}
                      width={36}
                      height={56}
                      alt="footstep"
                      className="mt-8 inline-block"
                    />
                  </div>
                  <div key={`r-${i}`} className="text-left">
                    <Image src={right} width={36} height={56} alt="footstep" />
                  </div>
                </span>
              ))}
            </div>

            <h2 className="kw-text-cta text-theme-900">
              Experience the power of collective philanthropy
            </h2>

            <div className="space-y-6 mx-auto max-w-sm">
              <CTAButton href="/sign-in">Join the village</CTAButton>
              <CTAButton
                href="/pledge"
                className="!button-secondary bg-white hover:bg-theme-50 border border-theme-200 text-theme-700 hover:text-theme-900 flex items-center justify-center transition-colors"
              >
                Make a one-time gift
              </CTAButton>
              <div className="block pt-3 pb-4 sm:pt-6 text-center text-lg font-medium text-theme-800">
                Already a villager?{" "}
                <Link
                  href="/sign-in"
                  className="font-medium text-theme-500 hover:text-theme-600 underline underline-offset-2 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div
        className="overflow-hidden border-t border-dashed border-theme-300 px-6"
        aria-labelledby="footer-heading"
      >
        <h2 id="footer-heading" className="sr-only">
          Footer
        </h2>
        <div className="mx-auto max-w-7xl px-2 pb-8 pt-14 sm:pt-20">
          <div className="xl:grid xl:grid-cols-12 xl:gap-8">
            {/* Links Grid */}
            <div className="grid gap-8 xl:col-span-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {footerSections.map((section) => (
                  <div key={section.title} className="space-y-6">
                    <h3 className="text-lg font-semibold text-theme-900 border-b border-theme-200 pb-2">
                      {section.title}
                    </h3>
                    <nav role="navigation" aria-label={section.title}>
                      <ul className="space-y-3">
                        {section.links.map(({ href, label, external }) => (
                          <li key={label}>
                            {external ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-2 text-theme-700 hover:text-theme-900 transition-colors duration-200 text-sm font-medium"
                              >
                                <span className="relative">
                                  {label}
                                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-theme-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></span>
                                </span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                            ) : (
                              <Link
                                href={href}
                                className="group inline-block text-theme-700 hover:text-theme-900 transition-colors duration-200 text-sm font-medium"
                              >
                                <span className="relative">
                                  {label}
                                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-theme-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></span>
                                </span>
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </div>
                ))}
              </div>
            </div>

            {/* Newsletter Section */}
            <div className="xl:col-span-4 mt-12 sm:mt-16 xl:mt-0">
              <div className="bg-white p-6 rounded-lg border border-theme-200 shadow-sm">
                <h3 className="text-lg font-semibold text-theme-900 mb-2">
                  Stay updated
                </h3>
                <p className="text-sm text-theme-700 mb-6">
                  Get the latest updates on our impact and new projects.
                </p>

                <form className="space-y-4">
                  <div className="flex w-full items-center gap-2">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      className="bg-white border-theme-200 focus:border-theme-500 focus:ring-theme-500 h-12 text-sm"
                      required
                    />
                    <Button
                      type="submit"
                      className="h-12 bg-theme-500 hover:bg-theme-600 text-white px-6 whitespace-nowrap transition-colors"
                    >
                      Subscribe
                    </Button>
                  </div>
                  <p className="text-xs text-theme-600">
                    We respect your privacy. Unsubscribe at any time.
                  </p>
                </form>

                {/* Social Links */}
                <div className="mt-8 pt-6 border-t border-theme-200">
                  <h4 className="text-sm font-medium text-theme-900 mb-4">
                    Follow us
                  </h4>
                  <div className="flex space-x-4">
                    <a
                      href="https://www.instagram.com/morris_monye/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-center w-10 h-10 rounded-full bg-theme-100 text-theme-700 hover:bg-theme-500 hover:text-white transition-colors duration-200"
                      aria-label="Morris Monye on Instagram"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                    <a
                      href="https://democracybuilders.ng/team/morris-monye/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-center w-10 h-10 rounded-full bg-theme-100 text-theme-700 hover:bg-theme-500 hover:text-white transition-colors duration-200"
                      aria-label="Morris Monye profile on Democracy Builders"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 border-t border-dashed border-theme-300 pt-8 sm:mt-16">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-theme-600">
                © 2026 MORRIS MONYE. A non-profit fund limited by guarantee.
              </p>
              <p className="text-xs text-theme-500">
                Built with ❤️ for collective impact
              </p>
              <div className="">
                {/* Alternative text-based "Powered by" if image doesn't include it */}
                <span className="text-sm md:text-base font-light italic text-gray-300">
                  Powered by{" "}
                </span>
                <Image
                    src={educareLogo} // Replace with the path to your edited image file
                    alt="Educare Logo"
                    width={150} // Adjust based on your image dimensions
                    height={60} // Adjust based on your image dimensions
                    className="object-contain"
                  />
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
