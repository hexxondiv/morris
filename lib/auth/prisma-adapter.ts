import {
  Prisma,
  PrismaClient,
  UserOnboardingState,
  UserStatus,
} from "@prisma/client";
import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters";

type PrismaTx = PrismaClient | Prisma.TransactionClient;

function splitName(name?: string | null) {
  const trimmed = name?.trim() ?? "";

  if (!trimmed) {
    return { firstName: null, lastName: null, displayName: null };
  }

  const [firstName, ...rest] = trimmed.split(/\s+/);

  return {
    firstName,
    lastName: rest.length ? rest.join(" ") : null,
    displayName: trimmed,
  };
}

function toAdapterUser(user: {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
}): AdapterUser {
  const fullName =
    user.displayName ??
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ??
    null;

  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerifiedAt,
    name: fullName || null,
    image: user.avatarUrl,
  };
}

async function ensureProfileAndDefaultRole(prisma: PrismaTx, userId: string) {
  await prisma.profile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const existingAssignment = await prisma.userRole.findFirst({
    where: { userId },
    select: { roleId: true },
  });

  if (existingAssignment) return;

  const defaultRole = await prisma.role.findUnique({
    where: { key: "user" },
    select: { id: true },
  });

  if (!defaultRole) return;

  await prisma.userRole.create({
    data: {
      userId,
      roleId: defaultRole.id,
    },
  });
}

export function PrismaAuthAdapter(prisma: PrismaClient): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">) {
      const name = splitName(user.name);

      const dbUser = await prisma.$transaction(async (tx) => {
        const nextUser = await tx.user.upsert({
          where: { email: user.email },
          update: {
            displayName: user.name ?? undefined,
            firstName: name.firstName ?? undefined,
            lastName: name.lastName ?? undefined,
            avatarUrl: user.image ?? undefined,
            emailVerifiedAt: user.emailVerified ?? undefined,
            status: UserStatus.ACTIVE,
          },
          create: {
            email: user.email,
            displayName: name.displayName,
            firstName: name.firstName,
            lastName: name.lastName,
            avatarUrl: user.image ?? null,
            emailVerifiedAt: user.emailVerified ?? null,
            status: UserStatus.ACTIVE,
            onboardingState: UserOnboardingState.PENDING_PROFILE,
          },
        });

        await ensureProfileAndDefaultRole(tx, nextUser.id);

        return nextUser;
      });

      return toAdapterUser(dbUser);
    },

    async getUser(id) {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      return user ? toAdapterUser(user) : null;
    },

    async getUserByEmail(email) {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      return user ? toAdapterUser(user) : null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
        include: {
          user: true,
        },
      });

      return account?.user ? toAdapterUser(account.user) : null;
    },

    async updateUser(user) {
      const name = splitName(user.name);

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: user.email ?? undefined,
          displayName: user.name === undefined ? undefined : name.displayName,
          firstName: user.name === undefined ? undefined : name.firstName,
          lastName: user.name === undefined ? undefined : name.lastName,
          avatarUrl: user.image ?? undefined,
          emailVerifiedAt: user.emailVerified ?? undefined,
        },
      });

      return toAdapterUser(updatedUser);
    },

    async linkAccount(account: AdapterAccount) {
      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
        update: {
          userId: account.userId,
          type: account.type,
          refreshToken: account.refresh_token ?? null,
          accessToken: account.access_token ?? null,
          expiresAt: account.expires_at ?? null,
          tokenType: account.token_type ?? null,
          scope: account.scope ?? null,
          idToken: account.id_token ?? null,
          sessionState: account.session_state ?? null,
        },
        create: {
          userId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refreshToken: account.refresh_token ?? null,
          accessToken: account.access_token ?? null,
          expiresAt: account.expires_at ?? null,
          tokenType: account.token_type ?? null,
          scope: account.scope ?? null,
          idToken: account.id_token ?? null,
          sessionState: account.session_state ?? null,
        },
      });

      return account;
    },

    async createSession(session) {
      const createdSession = await prisma.session.create({
        data: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expiresAt: session.expires,
        },
      });

      await prisma.user.update({
        where: { id: session.userId },
        data: { lastSignedInAt: new Date() },
      });

      return {
        sessionToken: createdSession.sessionToken,
        userId: createdSession.userId,
        expires: createdSession.expiresAt,
      };
    },

    async getSessionAndUser(sessionToken) {
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });

      if (!session) return null;

      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expiresAt,
        },
        user: toAdapterUser(session.user),
      };
    },

    async updateSession(session) {
      const updatedSession = await prisma.session
        .update({
          where: { sessionToken: session.sessionToken },
          data: {
            expiresAt: session.expires ?? undefined,
          },
        })
        .catch(() => null);

      if (!updatedSession) return null;

      return {
        sessionToken: updatedSession.sessionToken,
        userId: updatedSession.userId,
        expires: updatedSession.expiresAt,
      };
    },

    async deleteSession(sessionToken) {
      const deletedSession = await prisma.session
        .delete({
          where: { sessionToken },
        })
        .catch(() => null);

      if (!deletedSession) return null;

      return {
        sessionToken: deletedSession.sessionToken,
        userId: deletedSession.userId,
        expires: deletedSession.expiresAt,
      };
    },

    async createVerificationToken(token) {
      const createdToken = await prisma.verificationToken.create({
        data: {
          identifier: token.identifier,
          token: token.token,
          expiresAt: token.expires,
        },
      });

      return {
        identifier: createdToken.identifier,
        token: createdToken.token,
        expires: createdToken.expiresAt,
      };
    },

    async useVerificationToken(token) {
      const usedToken = await prisma.verificationToken
        .delete({
          where: {
            identifier_token: {
              identifier: token.identifier,
              token: token.token,
            },
          },
        })
        .catch(() => null);

      if (!usedToken) return null;

      return {
        identifier: usedToken.identifier,
        token: usedToken.token,
        expires: usedToken.expiresAt,
      };
    },
  };
}
