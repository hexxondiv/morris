import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db/prisma";
import { PrismaAuthAdapter } from "@/lib/auth/prisma-adapter";
import { getPrimaryRole, normalizeRole } from "@/lib/auth/roles";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAuthAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== "google") return false;

      const email = user.email?.trim();
      const googleProfile = profile as { email?: string; email_verified?: boolean } | undefined;

      if (!email) return false;
      if (googleProfile?.email && googleProfile.email !== email) return false;
      if (googleProfile?.email_verified === false) return false;

      return true;
    },
    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          userRoles: {
            include: {
              role: {
                select: { key: true },
              },
            },
          },
        },
      });

      const primaryRole = dbUser ? getPrimaryRole(dbUser.userRoles) : "user";

      session.user = {
        ...session.user,
        id: user.id,
        email: dbUser?.email ?? session.user?.email ?? "",
        name:
          dbUser?.displayName ??
          session.user?.name ??
          ([dbUser?.firstName, dbUser?.lastName].filter(Boolean).join(" ") || null),
        image: dbUser?.avatarUrl ?? session.user?.image ?? null,
        firstName: dbUser?.firstName ?? null,
        lastName: dbUser?.lastName ?? null,
        avatarUrl: dbUser?.avatarUrl ?? null,
        role: normalizeRole(primaryRole),
      };

      return session;
    },
  },
};
