import { type Metadata } from "next";
import { getServerSession } from "next-auth";
import { Inter, League_Spartan } from "next/font/google";
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

const inter = Inter({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const league = League_Spartan({
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-league",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" />
      </head>
      <body
        className={`${inter.variable} ${league.variable} font-inter antialiased`}
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
