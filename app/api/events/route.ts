import { NextResponse } from "next/server";
import { listEventsForPublicDashboard } from "@/lib/services/event-service";

export async function GET() {
  try {
    const events = await listEventsForPublicDashboard();
    return NextResponse.json(events, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
