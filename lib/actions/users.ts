"use server";

import { auth, clerkClient, createClerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getUserRoleFromClerk, syncRole } from "@/lib/actions";
import { User as ClerkUser } from "@clerk/nextjs/server";
import { getSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";

export async function updateUserRole(userId: string, role: string) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return { success: false, error: "Unauthorized" };
  }

  const userRole = await getUserRoleFromClerk(currentUserId);
  if (userRole !== "admin") {
    return { success: false, error: "Admin access required" };
  }

  const validRoles = ["admin", "moderator", "editor", "user"];
  if (!validRoles.includes(role)) {
    return { success: false, error: "Invalid role" };
  }

  const clerk = await clerkClient();
  try {
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    });
    await syncRole({ id: userId, publicMetadata: { role } });
    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    console.error("Error updating role:", error);
    return { success: false, error: "Failed to update role" };
  }
}

export async function deactivateUser(userId: string) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return { success: false, error: "Unauthorized" };
  }

  const userRole = await getUserRoleFromClerk(currentUserId);
  if (userRole !== "admin") {
    return { success: false, error: "Admin access required" };
  }

  const clerk = await clerkClient();
  try {
    await clerk.users.deleteUser(userId);
    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    console.error("Error deactivating user:", error);
    return { success: false, error: "Failed to deactivate user" };
  }
}

export async function deleteAllUsers() {
  const clerk = await clerkClient();
  const response = await clerk.users.getUserList({ limit: 100 }); // up to 100 per page
  console.log(`Found ${response.data.length} users.`);

  for (const user of response.data) {
    await clerk.users.deleteUser(user.id);
    console.log(`Deleted user: ${user.id}`);
  }

  console.log("Done.");
}

export async function updateUserDetails(
  userId: string,
  data: { firstName: string; lastName: string; email: string; role: string }
) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return { success: false, error: "Unauthorized" };
  }

  const userRole = await getUserRoleFromClerk(currentUserId);
  if (userRole !== "admin") {
    return { success: false, error: "Admin access required" };
  }
  
  const clerk = await clerkClient();
  try {
    const validRoles = ["admin", "moderator", "editor", "user"];
    if (!validRoles.includes(data.role)) {
      return { success: false, error: "Invalid role" };
    }
    // Update user metadata for role
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { role: data.role },
    });

    // Update user details (firstName, lastName)
    await clerk.users.updateUser(userId, {
      firstName: data.firstName,
      lastName: data.lastName,
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating user details:", error);
    return { success: false, error: "Failed to update user details" };
  }
}

  export async function getUser(): Promise<ClerkUser | null> {
    try {
      const { userId } = await auth();
      
      if (!userId) {
        return null;
      }

      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      
      return user;
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  }

export async function getUsers(page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit;
  const clerk = await clerkClient();
  const response = await clerk.users.getUserList({ limit, offset });
  
  const users = response.data.map((user: ClerkUser) => ({
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress || "No email",
    role: (user.publicMetadata?.role as string) || "user",
    createdAt: user.createdAt,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
  }));

  return users;
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
      data: { first_name, last_name, email, role, avatar_url }
    };

  } catch (error) {
    console.error("Error saving profile:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to save profile" 
    };
  }
}
