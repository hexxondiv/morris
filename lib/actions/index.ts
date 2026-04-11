"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabaseClient } from "../supabase";
import { supabaseAdmin } from "../supabase-admin";
import { Role } from "@/types/database.types";

function getProjectById(id: string) {
  return supabaseClient.from("projects").select("*").eq("id", id).single();
}

function getProjectsByStatus(statuses: string[]) {
  return supabaseClient.from("projects").select("*").in("status", statuses);
}

function getAllProjects() {
  return supabaseClient.from("projects").select("*");
}

async function syncRoles() {
  const clerk = await clerkClient();
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await clerk.users.getUserList({
      limit,
      offset,
    });

    if (response.data.length === 0) break;

    for (const user of response.data) {
      const role = user.publicMetadata.role || "user";
      await supabaseAdmin
        .from("profiles")
        .upsert({ id: user.id, role }, { onConflict: "id" });
    }

    offset += limit;

    // Break if we've processed all users
    if (response.data.length < limit) break;
  }
}

async function syncRole(user: {
  id: string;
  publicMetadata: { role?: string };
}) {
  const role = user.publicMetadata.role || "user";
  await supabaseAdmin
    .from("profiles")
    .upsert({ id: user.id, role }, { onConflict: "id" });
}

async function getUserRoleFromSupabase(userId: string | null) {
  if (!userId) return null;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !data) return "user";
  return data.role || ("user" as Role);
}

async function getUserRoleFromClerk(userId: string | null) {
  if (!userId) return "user";
  
  try {
    const clerk = await clerkClient();
    
    const user = await clerk.users.getUser(userId);
    
    const role = (user.publicMetadata?.role as Role) || "user";
    return role;
  } catch (error) {
    console.error('Full Clerk error object:', JSON.stringify(error, null, 2));
    return "user";
  }
}

interface CanUserVoteResult {
  canVote: boolean;
  message: string;
}

async function canUserVote(userId: string | null): Promise<CanUserVoteResult> {
  if (!userId) {
    return {
      canVote: false,
      message: "Please sign in to vote on projects.",
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select("payment_status")
      .eq("user_id", userId)
      .eq("payment_status", "completed")
      .limit(1)
      .single();

    if (error || !data) {
      return {
        canVote: false,
        message:
          "You need to have a completed donation to vote. Please make a donation first.",
      };
    }

    return {
      canVote: true,
      message: "You are eligible to vote!",
    };
  } catch (error) {
    console.error("Error checking voting eligibility:", error);
    return {
      canVote: false,
      message:
        "An error occurred while checking your voting eligibility. Please try again later.",
    };
  }
}

async function saveVote(projectId: string, vote: boolean): Promise<VoteResult> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        previousVote: null,
        error: "User must be authenticated to vote",
      };
    }

    const now = new Date().toISOString();

    // Check if the voting period is open
    const { data: votingPeriod, error: periodError } = await supabaseAdmin
      .from("voting_periods")
      .select("start_date, end_date")
      .eq("project_id", projectId)
      .single();

    if (periodError || !votingPeriod) {
      console.error("Error fetching voting period:", periodError);
      return {
        success: false,
        previousVote: null,
        error: "No valid voting period found for this project",
      };
    }

    if (now < votingPeriod.start_date || now > votingPeriod.end_date) {
      return {
        success: false,
        previousVote: null,
        error: "Voting is not open for this project",
      };
    }

    // Check if the user has already voted
    const { data: existingVote, error: fetchError } = await supabaseAdmin
      .from("votes")
      .select("vote")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching existing vote:", fetchError);
      return {
        success: false,
        previousVote: null,
        error: "Failed to check existing vote",
      };
    }

    let previousVote: boolean | null = existingVote?.vote ?? null;

    if (existingVote) {
      // Update existing vote
      const { error: updateError } = await supabaseAdmin
        .from("votes")
        .update({ vote, updated_at: new Date().toISOString() })
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating vote:", updateError);
        return {
          success: false,
          previousVote,
          error: "Failed to update vote",
        };
      }
    } else {
      // Insert new vote
      const { error: insertError } = await supabaseAdmin
        .from("votes")
        .insert({ project_id: projectId, user_id: userId, vote });

      if (insertError) {
        console.error("Error inserting vote:", insertError);
        return {
          success: false,
          previousVote: null,
          error: "Failed to submit vote",
        };
      }
    }

    return {
      success: true,
      previousVote,
    };
  } catch (error) {
    console.error("Error saving vote:", error);
    return {
      success: false,
      previousVote: null,
      error: error instanceof Error ? error.message : "Failed to save vote",
    };
  }
}

export interface VoteResult {
  success: boolean;
  previousVote: boolean | null;
  error?: string;
}

export {
  getProjectById,
  getProjectsByStatus,
  getAllProjects,
  syncRoles,
  syncRole,
  getUserRoleFromSupabase,
  getUserRoleFromClerk,
  canUserVote,
  saveVote,
};
