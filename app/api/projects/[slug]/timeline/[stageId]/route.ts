import { requireRole } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";
import {
  deleteTimelineStage,
  updateTimelineStage,
} from "@/lib/services/timeline-service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; stageId: string }> }
) {
  const auth = await requireRole("moderator");
  if (!auth.authorized) return auth.response;

  try {
    const { slug, stageId } = await params;
    const body = await request.json();

    const result = await updateTimelineStage(slug, stageId, {
      title: body.title,
      description: body.description,
      planned_cost: parseFloat(body.planned_cost) || 0,
      planned_start_date: body.planned_start_date || undefined,
      planned_end_date: body.planned_end_date || undefined,
      media_urls: body.media_urls || [],
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Project not found" ? 404 : 500 }
      );
    }

    return NextResponse.json({ stage: result.stage });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; stageId: string }> }
) {
  const auth = await requireRole("moderator");
  if (!auth.authorized) return auth.response;

  try {
    const { slug, stageId } = await params;

    const result = await deleteTimelineStage(slug, stageId);
    if (!result.success) {
      const status =
        result.error === "Project not found" || result.error === "Timeline stage not found"
          ? 404
          : result.error === "Cannot delete completed stages"
            ? 400
            : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ message: "Stage deleted successfully" });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
