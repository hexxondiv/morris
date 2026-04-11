import { NextResponse } from "next/server";
import { getMarqueePayload } from "@/lib/repositories/ledger-metrics-repository";

export async function GET() {
  try {
    const data = await getMarqueePayload();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error("Marquee API:", err);
    return NextResponse.json(
      { error: "Failed to fetch marquee data" },
      { status: 500 }
    );
  }
}
