import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server";
import {
  createTimelineStages,
  getTimelinePayloadForSlug,
  replaceProjectTimeline,
} from "@/lib/services/timeline-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { project, timeline } = await getTimelinePayloadForSlug(slug);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ project, timeline });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireRole("moderator");
  if (!auth.authorized) return auth.response;

  try {
    const { slug } = await params;
    const body = await request.json();
    const { stages } = body;

    if (!stages || !Array.isArray(stages)) {
      return NextResponse.json({ error: "Invalid stages data" }, { status: 400 });
    }

    const result = await createTimelineStages(slug, stages, auth.userId);
    if (!result.success) {
      const status =
        result.error === "Project not found"
          ? 404
          : result.error === "Timeline already exists for this project"
            ? 400
            : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ timeline: result.timeline });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireRole("moderator");
  if (!auth.authorized) return auth.response;

  try {
    const { slug } = await params;
    const body = await request.json();
    const { stages } = body;

    if (!stages || !Array.isArray(stages)) {
      return NextResponse.json({ error: "Invalid stages data" }, { status: 400 });
    }

    const result = await replaceProjectTimeline(slug, stages, auth.userId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Project not found" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      timeline: result.timeline,
      message: result.message,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
