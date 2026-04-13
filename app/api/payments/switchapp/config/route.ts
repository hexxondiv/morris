import { NextResponse } from "next/server";

function normalizedPublicOrigin(): string {
  const raw = (
    process.env.NEXT_PUBLIC_PAYMENTS_PUBLIC_ORIGIN ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    ""
  ).trim();
  return raw.replace(/\/$/, "");
}

export async function GET() {
  const publicKey = (process.env.NEXT_PUBLIC_SW_PUBLIC_KEY || "").trim();
  const publicOrigin = normalizedPublicOrigin();

  return NextResponse.json(
    {
      publicKey,
      publicOrigin,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
