// app/api/projects/[slug]/timeline/[stageId]/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';

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
  const { userId } = getAuth(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parseResult = completeStageSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ 
      error: "Invalid completion data",
      details: parseResult.error.errors 
    }, { status: 400 });
  }

  const { actual_cost, completion_notes, actual_end_date, completion_media_urls } = parseResult.data;
  const { slug, stageId } = await params;

  try {
    // Single query to get project and validate stage in one go
    const { data: stageWithProject, error: stageError } = await supabaseAdmin
      .from('project_timelines')
      .select(`
        *,
        projects!inner(id, slug)
      `)
      .eq('id', stageId)
      .eq('projects.slug', slug)
      .single();

    if (stageError || !stageWithProject) {
      return NextResponse.json({ error: 'Timeline stage not found' }, { status: 404 });
    }

    if (stageWithProject.status === 'completed') {
      return NextResponse.json({ error: 'Stage is already completed' }, { status: 400 });
    }

    // Optional: Check sequential completion with a single query
    if (stageWithProject.stage_order > 1) {
      const { count: incompleteCount } = await supabaseAdmin
        .from('project_timelines')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', stageWithProject.projects.id)
        .lt('stage_order', stageWithProject.stage_order)
        .neq('status', 'completed');

      if (incompleteCount && incompleteCount > 0) {
        return NextResponse.json({
          error: 'Previous stages must be completed first'
        }, { status: 400 });
      }
    }

    // Update stage
    const updateData = {
      status: 'completed' as const,
      actual_cost: actual_cost ?? null,
      completion_notes: completion_notes ?? null,
      completion_media_urls: completion_media_urls ?? [],
      actual_end_date: actual_end_date ?? new Date().toISOString(),
      completed_by: userId,
      updated_at: new Date().toISOString(),
      ...((!stageWithProject.actual_start_date) && { 
        actual_start_date: new Date().toISOString() 
      })
    };

    const { data: updatedStage, error: updateError } = await supabaseAdmin
      .from('project_timelines')
      .update(updateData)
      .eq('id', stageId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Stage update error:', updateError);
      return NextResponse.json({ error: 'Failed to complete stage' }, { status: 500 });
    }

    // Async project updates (non-blocking)
    updateProjectTotals(stageWithProject.projects.id).catch(console.error);

    return NextResponse.json({ 
      stage: updatedStage,
      message: 'Timeline stage completed successfully'
    });

  } catch (error) {
    console.error('Stage completion failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Separate function for project calculations (can be async/background)
async function updateProjectTotals(projectId: string) {
  const { data: stages } = await supabaseAdmin
    .from('project_timelines')
    .select('status, actual_cost')
    .eq('project_id', projectId)
    .order('stage_order');

  if (!stages) return;

  const completedStages = stages.filter(s => s.status === 'completed');
  const totalSpent = completedStages.reduce(
    (sum, stage) => sum + (parseFloat(stage.actual_cost?.toString() || '0') || 0),
    0
  );

  const updates = {
    current_amount: totalSpent,
    ...(completedStages.length === stages.length && { status: 'completed' })
  };

  await supabaseAdmin
    .from('projects')
    .update(updates)
    .eq('id', projectId);
}