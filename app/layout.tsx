import { type Metadata } from "next";
import { getServerSession } from "next-auth";
import localFont from "next/font/local";
import "./globals.scss";
import { Toaster } from "sonner";
import { SettingsInitializer } from "@/components/settings/settings-initializer";
import { AuthSessionProvider } from "@/lib/auth-client";
import { authOptions } from "@/lib/auth/options";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  ),
  title: "MORRIS MONYE",
  description:
    "MORRIS MONYE is a community-driven platform for funding and supporting impactful projects in South-East Nigeria.",
  openGraph: {
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "MORRIS MONYE - community-driven project funding",
        type: "image/png",
      },
    ],
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
    other: [
      { rel: "icon", url: "/favicon-32x32.png", sizes: "32x32" }, // optional if you add variants
    ],
  },
};

// Self-hosted variable fonts (@fontsource-variable/*) so `next build` never calls Google Fonts
// (avoids ETIMEDOUT / air-gapped CI failures from `next/font/google`).
const inter = localFont({
  src: [
    {
      path: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-inter",
});

const league = localFont({
  src: [
    {
      path: "../node_modules/@fontsource-variable/league-spartan/files/league-spartan-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource-variable/league-spartan/files/league-spartan-latin-ext-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-league",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (err) {
    console.error("[root layout] getServerSession failed:", err);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" />
      </head>
      <body
        className={`${inter.variable} ${league.variable} font-inter antialiased`}
        suppressHydrationWarning
      >
        <AuthSessionProvider session={session}>
          <SettingsInitializer />
          <Toaster richColors position="top-right" />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
