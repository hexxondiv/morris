'use server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { capitalize } from 'lodash';
import { pledgeSchema } from '../zod-schema';



export async function createPledge(formData: FormData) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return { error: 'You must be signed in to pledge' };
    }

    // Parse and validate form data
    const data = {
      projectId: formData.get('projectId') as string | undefined,
      amount: Number(formData.get('amount')),
      pledgeType: formData.get('pledgeType') as 'one_time' | 'recurring',
      recurrenceInterval: formData.get('recurrenceInterval') as 'monthly' | 'quarterly' | 'yearly' | undefined,
      paymentDay: formData.get('paymentDay') as 'today' | '1st' | '28th' | undefined,
    };
    console.log('Creating pledge with data:', data);
    const validated = pledgeSchema.safeParse(data);
    if (!validated.success) {
      return { error: validated.error.errors[0].message };
    }

    // Check project status if projectId is provided
    let projectSlug: string | null = null;
    if (validated.data.projectId) {
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('status, slug')
        .eq('id', validated.data.projectId)
        .single();

      if (projectError || !project) {
        return { error: 'Project not found' };
      }

      if (!['active', 'voting'].includes(project.status)) {
        return { error: 'Pledges are only allowed for active or voting projects' };
      }
      projectSlug = project.slug;
    }

    // Insert pledge
    const { data: pledgeData, error: pledgeError } = await supabaseAdmin.from('pledges').insert({
      project_id: validated.data.projectId || null,
      user_id: userId,
      amount: validated.data.amount,
      pledge_type: validated.data.pledgeType,
      recurrence_interval: validated.data.recurrenceInterval || null,
      status: 'pending',
      payment_day: validated.data.paymentDay || null,
    });

    if (pledgeError) {
      console.error('Pledge error:', pledgeError);
      return { error: 'Failed to create pledge' };
    }

    // Update project current_amount if tied to a project
    if (validated.data.projectId) {
      const { error: updateError } = await supabaseAdmin
        .from('projects')
        .update({ current_amount: validated.data.amount })
        .eq('id', validated.data.projectId);

      if (updateError) {
        console.error('Error updating project amount:', updateError);
        return { error: 'Pledge created, but failed to update project amount' };
      }
    }

    // Revalidate paths
    if (projectSlug) {
      revalidatePath(`/projects/${projectSlug}`);
    }
    revalidatePath('/dashboard');

    return { success: 'Pledge created successfully', projectSlug };
  } catch (error) {
    console.error('Error creating pledge:', error);
    return { error: 'Internal server error' };
  }
}

interface Pledge {
  id: string;
  user_id: string;
  user_email: string;
  full_name: string;  
  project_id: string | null;
  project_title: string | null;
  amount: number;
  pledge_type: "one_time" | "recurring";
  recurrence_interval: "monthly" | "quarterly" | "yearly" | null;
  payment_day: "today" | "1st" | "28th" | null;
  status: "pending" | "completed" | "failed" | "cancelled";
  created_at: string;
}

export async function fetchPledges(pageIndex: number, pageSize: number, globalFilter: string) {
  try {
    const { data, error } = await supabaseAdmin.rpc("get_pledges", {
      page_index: pageIndex,
      page_size: pageSize,
      filter: globalFilter || null,
    });

    if (error) {
      console.log(error);
      throw new Error(error.message);
    }

    // Transform data to match Pledge interface
    const pledges: Pledge[] = data.map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      user_email: item.user_email || "Unknown",
      full_name: capitalize(item.first_name || "") + " " + capitalize(item.last_name || ""),
      project_id: item.project_id,
      project_title: item.project_title || null,
      amount: item.amount,
      pledge_type: item.pledge_type,
      recurrence_interval: item.recurrence_interval,
      payment_day: item.payment_day,
      status: item.status,
      created_at: item.created_at,
    }));


    const total = data[0]?.total_count || 0;

    return { data: pledges, total };
  } catch (error) {
    console.error("Error fetching pledges:", error);
    return { data: [], total: 0 };
  }
}

export async function markPledgeAsCompleted(
  pledgeId: string,
  userId: string,
  projectId: string | null,
  amount: number
) {
  try {
    // Update pledge status
    const { data: updatedPledge, error: pledgeError } = await supabaseAdmin
      .from("pledges")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", pledgeId)
      .eq("status", "pending")
      .select()
      .single();

    if (pledgeError || !updatedPledge) {
      throw new Error(pledgeError?.message || "Pledge is not in pending status or does not exist");
    }

    // Create transaction record
    const { error: transactionError } = await supabaseAdmin.from("transactions").insert({
      pledge_id: pledgeId,
      user_id: userId,
      project_id: projectId,
      amount,
      status: "completed",
      created_at: new Date().toISOString(),
    });

    if (transactionError) {
      // Attempt to rollback pledge update (Supabase doesn't support transactions natively)
      await supabaseAdmin
        .from("pledges")
        .update({ status: "pending", updated_at: new Date().toISOString() })
        .eq("id", pledgeId);
      throw new Error(transactionError.message);
    }

    return { success: true };
  } catch (error) {
    console.error("Error marking pledge as completed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}