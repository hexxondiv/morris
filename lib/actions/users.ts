"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/server";
import { getPrimaryRole, normalizeRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import type { Role } from "@/types/database.types";
import { UserStatus } from "@prisma/client";

const ASSIGNABLE_ROLES: Role[] = ["admin", "moderator", "editor", "user"];

async function requireAdminActor() {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      userRoles: { include: { role: { select: { key: true } } } },
    },
  });
  if (!actor) {
    return { ok: false as const, error: "Unauthorized" };
  }
  const actorRole: Role = getPrimaryRole(actor.userRoles);
  if (actorRole !== "admin" && actorRole !== "super_admin") {
    return { ok: false as const, error: "Admin access required" };
  }
  return { ok: true as const, actor, actorRole };
}

export async function updateUserRole(userId: string, role: string) {
  const gate = await requireAdminActor();
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const normalized = normalizeRole(typeof role === "string" ? role : "");
  if (!ASSIGNABLE_ROLES.includes(normalized)) {
    return { success: false, error: "Invalid role" };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: { include: { role: { select: { key: true } } } },
    },
  });

  if (!targetUser) {
    return { success: false, error: "User not found" };
  }

  const targetPrimary = getPrimaryRole(targetUser.userRoles);
  if (targetPrimary === "super_admin" && gate.actorRole !== "super_admin") {
    return { success: false, error: "Forbidden" };
  }

  const roleRecord = await prisma.role.findUnique({ where: { key: normalized } });
  if (!roleRecord) {
    return {
      success: false,
      error: "Role is not provisioned in the database (run seed / migrations).",
    };
  }

  try {
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId } }),
      prisma.userRole.create({
        data: {
          userId,
          roleId: roleRecord.id,
          assignedBy: gate.actor.id,
        },
      }),
    ]);
    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    console.error("Error updating role:", error);
    return { success: false, error: "Failed to update role" };
  }
}

export async function deactivateUser(userId: string) {
  const gate = await requireAdminActor();
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: { include: { role: { select: { key: true } } } },
    },
  });
  if (!target) {
    return { success: false, error: "User not found" };
  }
  const targetPrimary = getPrimaryRole(target.userRoles);
  if (targetPrimary === "super_admin") {
    return { success: false, error: "Cannot deactivate a super admin" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.DEACTIVATED },
    });
    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    console.error("Error deactivating user:", error);
    return { success: false, error: "Failed to deactivate user" };
  }
}

export async function deleteAllUsers() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("deleteAllUsers is only available in development");
  }
  await prisma.user.deleteMany({
    where: {
      NOT: {
        userRoles: {
          some: { role: { key: "super_admin" } } },
      },
    },
  });
}

export async function updateUserDetails(
  userId: string,
  data: { firstName: string; lastName: string; email: string; role: string }
) {
  const gate = await requireAdminActor();
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const normalized = normalizeRole(data.role);
  if (!ASSIGNABLE_ROLES.includes(normalized)) {
    return { success: false, error: "Invalid role" };
  }

  const roleRecord = await prisma.role.findUnique({ where: { key: normalized } });
  if (!roleRecord) {
    return { success: false, error: "Role is not provisioned in the database." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          displayName: [data.firstName, data.lastName].filter(Boolean).join(" ") || null,
        },
      });
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.create({
        data: {
          userId,
          roleId: roleRecord.id,
          assignedBy: gate.actor.id,
        },
      });
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating user details:", error);
    return { success: false, error: "Failed to update user details" };
  }
}

export type SessionUserSummary = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
};

export async function getUser(): Promise<SessionUserSummary | null> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.avatarUrl,
    };
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export async function getUsers(page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit;
  const { listUsersForAdmin } = await import("@/lib/repositories/user-repository");
  return listUsersForAdmin(offset, limit, "");
}

export async function getTotalUserCount(query: string) {
  const { countUsersForAdmin } = await import("@/lib/repositories/user-repository");
  return countUsersForAdmin(query);
}

export async function insertDevProfile(userId: string) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("insertDevProfile can only be used in development");
  }

  const email = `${userId}@example.com`;
  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email,
      firstName: "Dev",
      lastName: "User",
      displayName: "Dev User",
    },
    update: {
      email,
      firstName: "Dev",
      lastName: "User",
      displayName: "Dev User",
    },
  });
  await prisma.profile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  return { id: userId, email, first_name: "Dev", last_name: "User" };
}

export async function saveProfile({
  first_name,
  last_name,
  email,
  role = "user",
  avatar_url,
}: {
  first_name: string;
  last_name: string;
  email: string;
  role?: "user" | "moderator" | "editor" | "admin" | "super_admin";
  avatar_url: string;
}) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        email,
        firstName: first_name || null,
        lastName: last_name || null,
        displayName: [first_name, last_name].filter(Boolean).join(" ") || null,
        avatarUrl: avatar_url || null,
      },
    });

    await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id },
    });

    return {
      success: true,
      data: { first_name, last_name, email, role, avatar_url },
    };
  } catch (error) {
    console.error("Error saving profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save profile",
    };
  }
}
