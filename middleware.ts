/**
 * Edge middleware: session presence only (Auth.js cookie names).
 * Full authentication and role checks run in route handlers via `@/lib/auth/server`.
 *
 * Public API prefixes must stay aligned with `app/api` route modules and public pages
 * that call those endpoints without a session. This layer gates on session cookies for
 * `/dashboard`, `/admin`, and `/api` (minus listed public paths).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function hasSessionCookie(request: NextRequest) {
  return [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "authjs.session-token",
    "__Secure-authjs.session-token",
  ].some((cookieName) => request.cookies.has(cookieName));
}

function isPublicRoute(pathname: string, method: string) {
  if (pathname.startsWith("/api/projects")) {
    return method === "GET";
  }

  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public-ledger") ||
    pathname.startsWith("/api/open-ledger-metrics") ||
    pathname.startsWith("/api/marquee-data") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/settings/public") ||
    pathname.startsWith("/api/cases/create") ||
    pathname.startsWith("/api/cases/upload") ||
    pathname.startsWith("/api/states") ||
    pathname.startsWith("/api/lgas")
  );
}

function isProtectedRoute(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api")
  );
}

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedRoute(pathname) || isPublicRoute(pathname, request.method)) {
    return NextResponse.next();
  }

  if (hasSessionCookie(request)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
