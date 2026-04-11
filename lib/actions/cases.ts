"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { Case, CaseWithDetails, CaseStatus, CaseNote } from "@/types/case.types";

export async function fetchCases(
  page: number,
  limit: number,
  search: string
): Promise<{ data: Case[]; total: number }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin
    .from("cases")
    .select(
      `
      id,
      case_reference_id,
      full_name,
      phone,
      email,
      state_id,
      lga_id,
      town,
      reporting_for,
      beneficiary_name,
      relationship,
      help_type,
      description,
      info_confirmed,
      contact_consent,
      updates_consent,
      user_id,
      status,
      created_at,
      updated_at,
      states!inner(name),
      lgas!inner(name)
    `,
      { count: "exact" }
    );

  if (search) {
    query = query.or(`
      case_reference_id.ilike.%${search}%,
      full_name.ilike.%${search}%,
      phone.ilike.%${search}%,
      email.ilike.%${search}%,
      description.ilike.%${search}%,
      town.ilike.%${search}%
    `);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching cases:", error);
    return { data: [], total: 0 };
  }

  const transformedData = (data || []).map((caseItem: any) => ({
    ...caseItem,
    state_name: caseItem.states?.name || "Unknown",
    lga_name: caseItem.lgas?.name || "Unknown",
  }));

  return {
    data: transformedData,
    total: count || 0,
  };
}

export async function fetchCaseById(id: string): Promise<CaseWithDetails | null> {
  try {
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from("cases")
      .select(
        `
        *,
        states!inner(name),
        lgas!inner(name)
      `
      )
      .eq("id", id)
      .single();

    if (caseError) {
      console.error("Error fetching case by ID:", caseError);
      return null;
    }

    const { data: files, error: filesError } = await supabaseAdmin
      .from("case_files")
      .select("*")
      .eq("case_id", id)
      .order("created_at", { ascending: true });

    if (filesError) {
      console.error("Error fetching case files:", filesError);
    }

    const { data: notes, error: notesError } = await supabaseAdmin
      .from("case_notes")
      .select("*")
      .eq("case_id", id)
      .order("created_at", { ascending: false });

    if (notesError) {
      console.error("Error fetching case notes:", notesError);
    }

    return {
      ...caseData,
      state_name: caseData.states?.name || "Unknown",
      lga_name: caseData.lgas?.name || "Unknown",
      files: files || [],
      notes: notes || [],
    };
  } catch (error) {
    console.error("Unexpected error fetching case:", error);
    return null;
  }
}

export async function updateCaseStatus(
  caseId: string,
  status: CaseStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("cases")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", caseId);

    if (error) {
      console.error("Error updating case status:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error updating case status:", error);
    return { success: false, error: error.message };
  }
}

export async function addCaseNote(
  caseId: string,
  note: string,
  adminUserId: string,
  adminName: string
): Promise<{ success: boolean; error?: string; note?: CaseNote }> {
  try {
    const { data, error } = await supabaseAdmin
      .from("case_notes")
      .insert({
        case_id: caseId,
        note,
        admin_user_id: adminUserId,
        admin_name: adminName,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding case note:", error);
      return { success: false, error: error.message };
    }

    return { success: true, note: data };
  } catch (error: any) {
    console.error("Unexpected error adding case note:", error);
    return { success: false, error: error.message };
  }
}

export async function acceptCase(
  caseId: string,
  adminUserId: string,
  adminName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update status to reviewing
    const { error: updateError } = await supabaseAdmin
      .from("cases")
      .update({ status: "reviewing", updated_at: new Date().toISOString() })
      .eq("id", caseId)
      .eq("status", "pending"); // Only accept if still pending

    if (updateError) {
      console.error("Error accepting case:", updateError);
      return { success: false, error: updateError.message };
    }

    // Add a note about acceptance
    const { error: noteError } = await supabaseAdmin
      .from("case_notes")
      .insert({
        case_id: caseId,
        note: "Case accepted and moved to reviewing status.",
        admin_user_id: adminUserId,
        admin_name: adminName,
      });

    if (noteError) {
      console.error("Error adding acceptance note:", noteError);
      // Don't fail the whole operation if note fails
    }

    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error accepting case:", error);
    return { success: false, error: error.message };
  }
}

export async function rejectCase(
  caseId: string,
  adminUserId: string,
  adminName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete the case
    const { error: deleteError } = await supabaseAdmin
      .from("cases")
      .delete()
      .eq("id", caseId)
      .eq("status", "pending"); // Only delete if still pending

    if (deleteError) {
      console.error("Error deleting case:", deleteError);
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error rejecting case:", error);
    return { success: false, error: error.message };
  }
}

export async function getCaseStatistics(): Promise<{
  total: number;
  pending: number;
  reviewing: number;
  approved: number;
  rejected: number;
  completed: number;
}> {
  try {
    const { count: total } = await supabaseAdmin
      .from("cases")
      .select("*", { count: "exact", head: true });

    const { count: pending } = await supabaseAdmin
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: reviewing } = await supabaseAdmin
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("status", "reviewing");

    const { count: approved } = await supabaseAdmin
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    const { count: rejected } = await supabaseAdmin
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected");

    const { count: completed } = await supabaseAdmin
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    return {
      total: total || 0,
      pending: pending || 0,
      reviewing: reviewing || 0,
      approved: approved || 0,
      rejected: rejected || 0,
      completed: completed || 0,
    };
  } catch (error) {
    console.error("Error fetching case statistics:", error);
    return {
      total: 0,
      pending: 0,
      reviewing: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    };
  }
}
