import { NextRequest, NextResponse } from "next/server";
import { getPublicLedgerData } from "@/lib/repositories/public-ledger-repository";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const filter = (searchParams.get("filter") || "all") as
      | "all"
      | "inflow"
      | "outflow";

    const result = await getPublicLedgerData(limit, filter);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch (e) {
    console.error("public-ledger API:", e);
    return NextResponse.json(
      { error: "Failed to load public ledger" },
      { status: 500 }
    );
  }
}
