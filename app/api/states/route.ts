import { NextResponse } from "next/server";
import { listStates } from "@/lib/repositories/state-repository";

/**
 * GET /api/states
 * Fetches all states from the database
 */
export async function GET() {
  try {
    const states = await listStates();

    const statesWithStringIds = states.map((state) => ({
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
