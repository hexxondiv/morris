import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/states
 * Fetches all states from the database
 */
export async function GET() {
  try {
    const { data: states, error } = await supabaseAdmin
      .from("states")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching states:", error);
      return NextResponse.json(
        { error: "Failed to fetch states", details: error.message },
        { status: 500 }
      );
    }

    // Convert integer IDs to strings for frontend compatibility
    const statesWithStringIds = states?.map((state) => ({
      ...state,
      id: String(state.id),
    }));

    return NextResponse.json({ states: statesWithStringIds }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error fetching states:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
