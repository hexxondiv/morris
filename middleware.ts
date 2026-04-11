import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",
  "/api(.*)",  // Protect all API routes by default
]);

const isPublicRoute = createRouteMatcher([
  "/api/open-ledger-metrics(.*)",
  "/api/marquee-data(.*)",
  "/api/projects(.*)",
  "/projects(.*)",
  "/api/webhooks(.*)",
  "/api/settings/public(.*)",
  "/api/cases/create(.*)",
  "/api/cases/upload(.*)",
  "/api/states(.*)",
  "/api/lgas(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Only protect if it's a protected route AND not a public route
  if (isProtectedRoute(req) && !isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};