// app/api/webhooks/switchapp/route.ts
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Define types based on SwitchApp webhook response
interface WebhookData {
  event: string;
  data: {
    id: string;
    status: string;
    metadata: string;
    gateway_code?: string;
    tx_ref: string;
    amount: number;
    paid_at?: string;
  };
}

interface Metadata {
  userId: string;
  pledgeId?: string;
  paymentType: 'pledge' | 'donation';
  projectId?: string;
  campaign?: string;
}

interface Transaction {
  pledge_id?: string;
  amount: number;
}

interface Pledge {
  id: string;
  project_id?: string;
  pledge_type: 'one_time' | 'recurring';
  amount: number;
}

// Valid webhook events
const VALID_EVENTS = ['charge.successful', 'charge.failed', 'charge.pending', 'charge.refunded'];

// Map SwitchApp status to internal status
const mapStatus = (status: string): string => (status === 'successful' ? 'completed' : status);

// Centralized logging
const logAudit = (message: string, details?: Record<string, any>) => {
  console.log(`[Webhook Audit] ${message}`, details ? JSON.stringify(details, null, 2) : '');
};

// Centralized error handler
const handleError = (message: string, error: any, status: number = 500) => {
  console.error(`[Webhook Error] ${message}:`, error);
  return NextResponse.json({ error: message }, { status });
};


// Update transaction in Supabase
const updateTransaction = async (
  txRef: string,
  status: string,
  paymentChannel: string | undefined,
  metadata: Metadata,
  event: string,
  paidAt: string | undefined
): Promise<Transaction> => {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .update({
      payment_status: status,
      payment_method: paymentChannel || null,
      metadata: { ...metadata, updatedStatus: status, switchappEvent: event, paid_at: paidAt },
      paid_at: paidAt ? new Date(paidAt).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('payment_ref', txRef)
    .select('pledge_id, amount')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update transaction: ${error?.message || 'No transaction found'}`);
  }

  logAudit(`Transaction ${txRef} updated`, { status });
  return data;
};

// Update pledge in Supabase
const updatePledge = async (pledgeId: string, status: string): Promise<Pledge> => {
  const { data, error } = await supabaseAdmin
    .from('pledges')
    .select('id, project_id, pledge_type, amount')
    .eq('id', pledgeId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch pledge: ${error?.message || 'Pledge not found'}`);
  }

  const pledgeStatus = data.pledge_type === 'one_time' && status === 'completed' ? 'completed' : status;

  const { error: updateError } = await supabaseAdmin
    .from('pledges')
    .update({
      status: pledgeStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pledgeId);

  if (updateError) {
    throw new Error(`Failed to update pledge: ${updateError.message}`);
  }

  logAudit(`Pledge ${pledgeId} updated`, { status: pledgeStatus });
  return data;
};

// Update project current_amount in Supabase using RPC
const updateProjectAmount = async (projectId: string, amount: number) => {
  const { data, error } = await supabaseAdmin.rpc('increment_project_current_amount', {
    row_id: projectId,
    increment_by: amount,
  });

  if (error) {
    throw new Error(`Failed to update project amount: ${error.message}`);
  }

  logAudit(`Project ${projectId} amount updated`, { amount, newAmount: data });
};

// Main webhook handler
export async function POST(request: Request) {
  try {
    const body: WebhookData = await request.json();
    logAudit('Received webhook', body);

    const { event, data } = body;
    if (!VALID_EVENTS.includes(event)) {
      logAudit(`Ignoring event: ${event}`);
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }

    const { status, metadata: metadataString, gateway_code: paymentChannel, tx_ref, amount, paid_at } = data;

    // Validate critical fields
    if (!tx_ref || !status || !amount || amount <= 0) {
      return handleError('Missing or invalid required fields', new Error('Invalid webhook data'), 400);
    }

    // Parse and validate metadata
    let metadata: Metadata;
    try {
      metadata = JSON.parse(metadataString);
      if (!metadata?.userId || !metadata?.paymentType) {
        return handleError('Missing required metadata', new Error('Invalid metadata'), 400);
      }
    } catch (parseError) {
      return handleError('Invalid metadata format', parseError, 400);
    }

    // Update transaction
    const mappedStatus = mapStatus(status);
    const transaction = await updateTransaction(tx_ref, mappedStatus, paymentChannel, metadata, event, paid_at);

    // Update pledge and project if applicable
    if (metadata.paymentType === 'pledge' && transaction.pledge_id) {
      const pledge = await updatePledge(transaction.pledge_id, mappedStatus);
      if (mappedStatus === 'completed' && pledge.project_id) {
        await updateProjectAmount(pledge.project_id, amount);
      }
    }

    // // Audit logging for payment type
    // switch (metadata.paymentType) {
    //   case 'pledge':
    //     logAudit(`Pledge ${tx_ref} ${mappedStatus}`, { projectId: metadata.projectId || 'N/A' });
    //     break;
    //   case 'donation':
    //     logAudit(`Donation ${tx_ref} ${mappedStatus}`, { campaign: metadata.campaign || 'N/A' });
    //     break;
    //   default:
    //     logAudit(`Unknown payment type: ${metadata.paymentType}`);
    // }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    return handleError('Webhook processing failed', error);
  }
}