import { getUserRoleFromClerk } from "@/lib/actions";
import { insertDevProfile } from "@/lib/actions/users";
import { requireRole } from "@/lib/auth/server";
import { Pledge } from "@/lib/columns/pledge-columns";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorized } from "@/lib/utils";
import { pledgeSchema } from "@/lib/zod-schema";
import { auth, getAuth } from "@clerk/nextjs/server";
import { capitalize } from "lodash";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const pageIndex = parseInt(searchParams.get("pageIndex") || "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const globalFilter = searchParams.get("globalFilter") || "";
  
  // Get specific filter parameters
  const statusFilter = searchParams.get("status") || "";
  const pledgeTypeFilter = searchParams.get("pledge_type") || "";
  const recurrenceIntervalFilter = searchParams.get("recurrence_interval") || "";
  
  // Get date range parameters
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const dateField = searchParams.get("dateField") || "created_at";

  try {
    // Build the query with filters
    let query = supabaseAdmin
      .from("pledges")
      .select(`
        id,
        user_id,
        project_id,
        amount,
        pledge_type,
        recurrence_interval,
        payment_day,
        status,
        created_at,
        profiles:user_id (
          email,
          first_name,
          last_name
        ),
        projects:project_id (
          title
        )
      `, { count: "exact" });

    // Apply global filter
    if (globalFilter) {
      query = query.or(`
        profiles.email.ilike.%${globalFilter}%,
        profiles.first_name.ilike.%${globalFilter}%,
        profiles.last_name.ilike.%${globalFilter}%,
        projects.title.ilike.%${globalFilter}%,
        status.ilike.%${globalFilter}%
      `);
    }

    // Apply specific filters
    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    if (pledgeTypeFilter) {
      query = query.eq("pledge_type", pledgeTypeFilter);
    }

    if (recurrenceIntervalFilter) {
      query = query.eq("recurrence_interval", recurrenceIntervalFilter);
    }

    // Apply date range filters
    if (dateFrom) {
      query = query.gte(dateField, dateFrom);
    }

    if (dateTo) {
      query = query.lte(dateField, dateTo);
    }

    // Apply pagination and ordering
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order(dateField, { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Database error:", error);
      throw new Error(error.message);
    }

    // Transform data to match Pledge interface
    const pledges = (data || []).map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      user_email: item.profiles?.email || "Unknown",
      full_name: item.profiles ? 
        `${capitalize(item.profiles.first_name || "")} ${capitalize(item.profiles.last_name || "")}`.trim() : 
        "Unknown",
      project_id: item.project_id,
      project_title: item.projects?.title || null,
      amount: item.amount,
      pledge_type: item.pledge_type,
      recurrence_interval: item.recurrence_interval,
      payment_day: item.payment_day,
      status: item.status,
      created_at: item.created_at,
    }));

    return NextResponse.json({ 
      data: pledges, 
      total: count || 0 
    });

  } catch (error) {
    console.error("Error fetching pledges:", error);
    return NextResponse.json({ 
      error: "Failed to fetch pledges" 
    }, { status: 500 });
  }
}
  

export async function POST(request: NextRequest) {
  const { userId } = getAuth(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
  }

  const body = await request.json();
  const parseResult = pledgeSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.errors }, { status: 400 });
  }

  const { amount, pledgeType, recurrenceInterval, paymentDay, projectId, anonymous } = parseResult.data;

  try {
    // Validate projectId if provided
    if (projectId) {
      const { data, error } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single();
      if (error || !data) {
        return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
      }
    }

    // Create pledge
    const { data: pledgeData, error: pledgeError } = await supabaseAdmin
      .from('pledges')
      .insert({
        project_id: projectId || null, // Null for general donations
        user_id: userId,
        amount,
        pledge_type: pledgeType,
        recurrence_interval: recurrenceInterval,
        payment_day: paymentDay,
        status: 'pending',
        anonymous
      })
      .select('id')
      .single();

    if (pledgeError) {
      console.error('Failed to create pledge:', pledgeError);
      if (pledgeError.code === '23503') {
        await insertDevProfile(userId);
        // Retry pledge creation
        const { data: retryPledgeData, error: retryPledgeError } = await supabaseAdmin
          .from('pledges')
          .insert({
            project_id: projectId || null,
            user_id: userId,
            amount,
            pledge_type: pledgeType,
            recurrence_interval: recurrenceInterval,
            payment_day: paymentDay,
            status: 'pending',
          })
          .select('id')
          .single();

        if (retryPledgeError) {
          console.error('Failed to create pledge after retry:', retryPledgeError);
          return NextResponse.json({ error: 'Failed to create pledge' }, { status: 500 });
        }

        return NextResponse.json({ pledgeId: retryPledgeData.id }, { status: 200 });
      }

      return NextResponse.json({ error: 'Failed to create pledge' }, { status: 500 });
    }

    return NextResponse.json({ pledgeId: pledgeData.id }, { status: 200 });
  } catch (error) {
    console.error('Pledge creation failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// function getAuth(request: NextRequest): { userId: any; } {
//   throw new Error("Function not implemented.");
// }
