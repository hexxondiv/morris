import { NextResponse } from "next/server";
import { listProjectsInActiveVotingWindow } from "@/lib/services/voting-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || null;

  try {
    const projects = await listProjectsInActiveVotingWindow(userId);
    return NextResponse.json({ data: projects });
  } catch (error) {
    console.error("Error fetching voting projects:", error);
    return NextResponse.json({ error: "Failed to fetch voting projects" }, { status: 500 });
  }
}