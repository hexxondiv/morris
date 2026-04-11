import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/states/[state_id]/lgas
 * Fetches all LGAs for a specific state
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ state_id: string }> }
) {
  try {
    const { state_id } = await params;

    if (!state_id) {
      return NextResponse.json(
        { error: "State ID is required" },
        { status: 400 }
      );
    }

    // Convert string state_id to integer for database query
    const stateIdInt = parseInt(state_id, 10);
    if (isNaN(stateIdInt)) {
      return NextResponse.json(
        { error: "Invalid state ID format" },
        { status: 400 }
      );
    }

    const { data: lgas, error } = await supabaseAdmin
      .from("lgas")
      .select("id, name, state_id")
      .eq("state_id", stateIdInt)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching LGAs:", error);
      return NextResponse.json(
        { error: "Failed to fetch LGAs", details: error.message },
        { status: 500 }
      );
    }

    // Convert integer IDs to strings for frontend compatibility
    const lgasWithStringIds = lgas?.map((lga) => ({
      ...lga,
      id: String(lga.id),
      state_id: String(lga.state_id),
    }));

    return NextResponse.json({ lgas: lgasWithStringIds }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error fetching LGAs:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
