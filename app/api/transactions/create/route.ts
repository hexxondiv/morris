// app/api/transactions/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { transactionSchema } from '@/lib/zod-schema';

export async function POST(request: NextRequest) {
  const { userId } = getAuth(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const body = await request.json();
  const parseResult = transactionSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ 
      error: "Invalid transaction data",
      details: parseResult.error.errors 
    }, { status: 400 });
  }

  const { 
    amount, 
    pledgeId, 
    paymentType, 
    projectId, 
    currency,
    chartId,
    description,
    paymentRef,
    timelineStageId
  } = parseResult.data;

  try {
    // Validate based on transaction type
    if (paymentType === 'pledge' && pledgeId) {
      const { data, error } = await supabaseAdmin
        .from('pledges')
        .select('id')
        .eq('id', pledgeId)
        .single();
      if (error || !data) {
        return NextResponse.json({ error: 'Invalid pledgeId' }, { status: 400 });
      }
    }

    if ((paymentType === 'deployment' || paymentType === 'expense') && !chartId) {
      return NextResponse.json({ error: 'chartId is required for deployment and expense transactions' }, { status: 400 });
    }

    if (paymentType === 'deployment' && !projectId) {
      return NextResponse.json({ error: 'projectId is required for deployment transactions' }, { status: 400 });
    }

    if (paymentType === 'deployment' && !timelineStageId) {
      return NextResponse.json({ error: 'timelineStageId is required for deployment transactions' }, { status: 400 });
    }

    // Validate chart exists and matches transaction type
    if (chartId) {
      const { data: chartData, error: chartError } = await supabaseAdmin
        .from('charts')
        .select('chart_type')
        .eq('id', chartId)
        .single();
      
      if (chartError || !chartData) {
        return NextResponse.json({ error: 'Invalid chartId' }, { status: 400 });
      }

      if (chartData.chart_type !== paymentType) {
        return NextResponse.json({ 
          error: `Chart type mismatch. Expected ${paymentType}, got ${chartData.chart_type}` 
        }, { status: 400 });
      }
    }

    // Validate project exists and is active (for deployment transactions)
    if (projectId) {
      const { data: projectData, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('status')
        .eq('id', projectId)
        .single();
      
      if (projectError || !projectData) {
        return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
      }

      if (projectData.status !== 'active') {
        return NextResponse.json({ error: 'Project must be active for deployment transactions' }, { status: 400 });
      }
    }

    // Validate timeline stage exists and belongs to project (for deployment transactions)
    if (timelineStageId && projectId) {
      const { data: stageData, error: stageError } = await supabaseAdmin
        .from('project_timelines')
        .select('project_id, status')
        .eq('id', timelineStageId)
        .single();
      
      if (stageError || !stageData) {
        return NextResponse.json({ error: 'Invalid timelineStageId' }, { status: 400 });
      }

      if (stageData.project_id !== projectId) {
        return NextResponse.json({ error: 'Timeline stage does not belong to the specified project' }, { status: 400 });
      }

      if (stageData.status === 'completed') {
        return NextResponse.json({ error: 'Cannot create transaction for completed timeline stage' }, { status: 400 });
      }
    }

    // Generate a unique transaction reference
    const txRef = paymentRef || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Prepare transaction data
    const transactionData: any = {
      user_id: userId,
      payment_type: paymentType,
      amount: amount,
      currency,
      payment_status: paymentType === 'pledge' ? 'pending' : 'completed',
      payment_ref: txRef,
      paid_at: paymentType === 'pledge' ? null : new Date().toISOString(),
      project_timeline_id: timelineStageId
    };

    // Add type-specific fields
    if (paymentType === 'pledge') {
      transactionData.pledge_id = pledgeId;
    } else {
      transactionData.chart_id = chartId;
      transactionData.description = description;
    }

    if (paymentType === 'deployment') {
      transactionData.project_id = projectId;
      transactionData.metadata = {
        timeline_stage_id: timelineStageId,
        paymentType,
      };
    }

    // Create transaction record
    const { data: transactionResult, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert(transactionData)
      .select('payment_ref, id')
      .single();

    if (transactionError) {
      console.error('Failed to create transaction:', transactionError);
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
    }

    return NextResponse.json({ 
      txRef: transactionResult.payment_ref,
      transactionId: transactionResult.id,
      message: 'Transaction created successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Transaction creation failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}