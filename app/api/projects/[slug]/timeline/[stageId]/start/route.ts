import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/server";
import { startTimelineStage } from "@/lib/services/timeline-service";

const startStageSchema = z.object({
  transaction_amount: z.number().positive().optional(),
  transaction_notes: z.string().optional(),
  transaction_ref: z.string().optional(),
  metadata: z.record(z.any()).default({}).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; stageId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { slug, stageId } = await params;

  const body = await request.json();
  const parseResult = startStageSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid start data",
        details: parseResult.error.errors,
      },
      { status: 400 }
    );
  }

  const { transaction_amount, transaction_notes, transaction_ref } =
    parseResult.data;

  const result = await startTimelineStage(slug, stageId, auth.userId, {
    transaction_amount,
    transaction_notes,
    transaction_ref,
  });

  if (!result.success) {
    const status =
      result.error === "Project not found" || result.error === "Timeline stage not found"
        ? 404
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    stage: result.stage,
    message: "Timeline stage started successfully",
  });
}
