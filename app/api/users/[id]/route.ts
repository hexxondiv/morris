// app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: "user" | "moderator" | "editor" | "admin" | null;
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

    // Fetch profile from Supabase
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, last_name, avatar_url, role, created_at, updated_at")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "User profile not found" }, { status: 404 });
      }
      console.error("Error fetching profile:", error);
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Return profile data
    const profile: Profile = {
      id: data.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      avatar_url: data.avatar_url,
      role: data.role as "user" | "moderator" | "editor" | "admin" | null,
      created_at: data.created_at,
      updated_at: data.updated_at,
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