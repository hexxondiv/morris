import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/server";
import { completeTimelineStage } from "@/lib/services/timeline-service";

const completeStageSchema = z.object({
  actual_cost: z.string().optional(),
  completion_notes: z.string().optional(),
  actual_end_date: z.string().optional(),
  completion_media_urls: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; stageId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = await request.json();
  const parseResult = completeStageSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid completion data",
        details: parseResult.error.errors,
      },
      { status: 400 }
    );
  }

  const {
    actual_cost,
    completion_notes,
    actual_end_date,
    completion_media_urls,
  } = parseResult.data;
  const { slug, stageId } = await params;

  const result = await completeTimelineStage(
    slug,
    stageId,
    {
      actual_cost,
      completion_notes,
      actual_end_date,
      completion_media_urls,
    },
    auth.userId
  );

  if (!result.success) {
    const status =
      result.error === "Project not found" || result.error === "Timeline stage not found"
        ? 404
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    stage: result.stage,
    message: "Timeline stage completed successfully",
  });
}
