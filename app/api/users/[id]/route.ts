// app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPrimaryRole } from "@/lib/auth/roles";

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: "user" | "moderator" | "editor" | "admin" | "super_admin" | null;
  created_at: string;
  updated_at: string | null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // Validate ID
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const profile: Profile = {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      avatar_url: user.avatarUrl,
      role: getPrimaryRole(user.userRoles),
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    };

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
