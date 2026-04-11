import { NextResponse } from "next/server";
import { listLgasForState } from "@/lib/repositories/state-repository";

/**
 * GET /api/states/[state_id]/lgas
 * Fetches all LGAs for a specific state
 */
export async function GET(
  _request: Request,
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

    const stateIdInt = parseInt(state_id, 10);
    if (isNaN(stateIdInt)) {
      return NextResponse.json(
        { error: "Invalid state ID format" },
        { status: 400 }
      );
    }

    const lgas = await listLgasForState(stateIdInt);

    const lgasWithStringIds = lgas.map((lga) => ({
      ...lga,
      id: String(lga.id),
      state_id: String(lga.stateId),
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
