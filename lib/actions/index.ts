"use server";

import { prisma } from "@/lib/db/prisma";
import { TransactionStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/server";
import { castVote } from "@/lib/services/voting-service";

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

async function saveVote(projectId: string, vote: boolean): Promise<VoteResult> {
  try {
    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return {
        success: false,
        previousVote: null,
        error: "User must be authenticated to vote",
      };
    }

    const result = await castVote({ userId, projectId, support: vote });
    if (!result.success) {
      return {
        success: false,
        previousVote: null,
        error: result.error,
      };
    }
    return {
      success: true,
      previousVote: result.previousVote,
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

export { canUserVote, saveVote };
