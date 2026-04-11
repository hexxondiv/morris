"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import type { Project } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { TransactionStatus } from "@prisma/client";
import { Role } from "@/types/database.types";
import { supabaseAdmin } from "../supabase-admin";
import {
  apiStatusesToPrisma,
  projectStatusToApi,
} from "@/lib/repositories/mappers";

function mapProjectRow(p: Project) {
  return {
    id: p.id,
    creator_id: p.creatorId,
    slug: p.slug,
    title: p.title,
    description: p.description,
    goal_amount: Number(p.goalAmount),
    current_amount: Number(p.currentAmount),
    status: projectStatusToApi(p.status),
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

async function getProjectById(id: string) {
  const p = await prisma.project.findUnique({ where: { id } });
  if (!p) return { data: null, error: { message: "Not found" } };
  return { data: mapProjectRow(p), error: null };
}

async function getProjectsByStatus(statuses: string[]) {
  const mapped = apiStatusesToPrisma(statuses);
  const rows = await prisma.project.findMany({
    where: mapped.length ? { status: { in: mapped } } : {},
  });
  return {
    data: rows.map(mapProjectRow),
    error: null,
  };
}

async function getAllProjects() {
  const rows = await prisma.project.findMany();
  return {
    data: rows.map(mapProjectRow),
    error: null,
  };
}

/** Workstream 05/06 boundary: bulk Clerk → legacy profile sync; remove after Clerk cutover. */
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

    offset += response.data.length;
    if (response.data.length < limit) break;
  }
}

/**
 * Workstream 05/06 boundary: writes legacy Supabase `profiles.role` only.
 * Canonical roles live in Prisma `UserRole`; migrate callers to Prisma (06).
 */
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userRoles: { include: { role: { select: { key: true } } } } },
  });
  if (!user) return "user";
  const { getPrimaryRole } = await import("@/lib/auth/roles");
  return getPrimaryRole(user.userRoles);
}

async function getUserRoleFromClerk(userId: string | null) {
  if (!userId) return "user";

  try {
    const clerk = await clerkClient();

    const user = await clerk.users.getUser(userId);

    const role = (user.publicMetadata?.role as Role) || "user";
    return role;
  } catch (error) {
    console.error("Full Clerk error object:", JSON.stringify(error, null, 2));
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
    const donation = await prisma.transaction.findFirst({
      where: {
        userId,
        status: TransactionStatus.COMPLETED,
      },
      select: { id: true },
    });

    if (!donation) {
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

/**
 * Workstream 06 boundary: voting mutations still use Supabase until votes are fully migrated.
 */
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

    const previousVote: boolean | null = existingVote?.vote ?? null;

    if (existingVote) {
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
