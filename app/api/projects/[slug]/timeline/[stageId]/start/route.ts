import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';

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
  const { userId } = getAuth(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug, stageId } = await params;

  const body = await request.json();
  const parseResult = startStageSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ 
      error: "Invalid start data",
      details: parseResult.error.errors 
    }, { status: 400 });
  }

  const { transaction_amount, transaction_notes, transaction_ref } = parseResult.data;
  try {
    // Get project by slug
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('slug', slug)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get current stage and all stages for reordering calculation
    const { data: currentStage, error: currentStageError } = await supabaseAdmin
      .from('project_timelines')
      .select('status, project_id, stage_order, metadata')
      .eq('id', stageId)
      .eq('project_id', project.id)
      .single();

      console.log(currentStage);

    if (currentStageError || !currentStage) {
      return NextResponse.json({ error: 'Timeline stage not found' }, { status: 404 });
    }

    if (currentStage.status !== 'pending' && currentStage.status !== 'in_progress') {
      return NextResponse.json({ error: 'Only pending in_progress stages can be started' }, { status: 400 });
    }

    // Get counts for efficient reordering
    const { data: statusCounts } = await supabaseAdmin
      .from('project_timelines')
      .select('status')
      .eq('project_id', project.id);

    const completedCount = statusCounts?.filter(s => s.status === 'completed').length || 0;
    let inProgressCount = statusCounts?.filter(s => s.status === 'in_progress').length || 0;

    // Calculate new stage order: completed + in_progress + 1
    if(currentStage.status === 'in_progress') inProgressCount--;
    const newStageOrder = completedCount + inProgressCount + 1;

    // Update the stage to in_progress with new order
    const { data: updatedStage, error: updateError } = await supabaseAdmin
      .from('project_timelines')
      .update({
        status: 'in_progress',
        stage_order: newStageOrder,
        actual_start_date: new Date().toISOString().split('T')[0],
        actual_cost: transaction_amount,
        metadata: {
          ...currentStage.metadata,
          transaction_amount,
          transaction_notes,
          transaction_ref,
          started_by: userId,
          started_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', stageId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to start timeline stage:', updateError);
      return NextResponse.json({ error: 'Failed to start stage' }, { status: 500 });
    }

    return NextResponse.json({ 
      stage: updatedStage,
      message: 'Timeline stage started successfully'
    });
  } catch (error) {
    console.error('Stage start failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}