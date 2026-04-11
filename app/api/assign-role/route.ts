import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/clerk";
import { syncRole } from "@/lib/actions";

export async function POST(req: Request) {
  const auth = await requireRole('admin');
  if (!auth.authorized) return auth.response;

  const { userId, role } = await req.json();
  const validRoles = ["admin", "moderator", "editor", "user"];

  if (!validRoles.includes(role)) {
    return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
  }

  const clerk = await clerkClient();
  try {
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    });
    await syncRole({ id: userId, publicMetadata: { role } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json({ success: false, error: "Failed to update role" }, { status: 500 });
  }
}