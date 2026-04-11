import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error:
        "Clerk user webhooks are retired for the Auth.js sign-in path. Final cleanup remains in workstream 09.",
    },
    { status: 410 }
  );
}
