import {
  Prisma,
  ProjectStatus,
  VoteChoice,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type VotingProjectApiRow = {
  id: string;
  title: string;
  vote_count: number;
  oppose_count: number;
  has_voted: boolean;
  current_vote: boolean | null;
};

export type VotingDashboardProject = VotingProjectApiRow & {
  description: string;
  goal_amount: number;
  cover_image: string | null;
  start_date: string | null;
  end_date: string | null;
};

function choiceToLegacyBoolean(c: VoteChoice): boolean | null {
  if (c === VoteChoice.SUPPORT) return true;
  if (c === VoteChoice.OPPOSE) return false;
  return null;
}

function legacyBooleanToChoice(support: boolean): VoteChoice {
  return support ? VoteChoice.SUPPORT : VoteChoice.OPPOSE;
}

const votingListInclude = {
  votingPeriod: true,
  votes: { select: { userId: true, choice: true } },
} satisfies Prisma.ProjectInclude;

const votingDashboardInclude = {
  ...votingListInclude,
} satisfies Prisma.ProjectInclude;

function mapRow(
  p: Prisma.ProjectGetPayload<{ include: typeof votingListInclude }>,
  userId: string | null
): VotingProjectApiRow {
  const votes = p.votes ?? [];
  const userVote = userId
    ? votes.find((v) => v.userId === userId)
    : undefined;
  return {
    id: p.id,
    title: p.title,
    vote_count: votes.filter((v) => v.choice === VoteChoice.SUPPORT).length,
    oppose_count: votes.filter((v) => v.choice === VoteChoice.OPPOSE).length,
    has_voted: !!userVote,
    current_vote: userVote ? choiceToLegacyBoolean(userVote.choice) : null,
  };
}

/** Matches legacy `GET /api/voting`: projects with an active voting-period window. */
export async function listProjectsInActiveVotingWindow(
  userId: string | null
): Promise<VotingProjectApiRow[]> {
  const now = new Date();
  const rows = await prisma.project.findMany({
    where: {
      votingPeriod: {
        startAt: { lte: now },
        endAt: { gte: now },
      },
    },
    include: votingListInclude,
    orderBy: { title: "asc" },
  });
  return rows.map((p) => mapRow(p, userId));
}

/** Dashboard voting page: status `voting` plus populated voting period (for dates). */
export async function listVotingDashboardProjects(
  userId: string
): Promise<VotingDashboardProject[]> {
  const rows = await prisma.project.findMany({
    where: { status: ProjectStatus.VOTING, votingPeriod: { isNot: null } },
    include: votingDashboardInclude,
    orderBy: { title: "asc" },
  });

  return rows.map((p) => {
    const base = mapRow(p, userId);
    const vp = p.votingPeriod;
    return {
      ...base,
      description: p.description || "No description available.",
      goal_amount: Number(p.goalAmount),
      cover_image: p.coverImageUrl ?? null,
      start_date: vp?.startAt.toISOString() ?? null,
      end_date: vp?.endAt.toISOString() ?? null,
    };
  });
}

export type CastVoteResult =
  | { success: true; previousVote: boolean | null }
  | { success: false; previousVote: null; error: string };

/**
 * Validates voting window and upserts the vote in a single transaction.
 */
export async function castVote(input: {
  userId: string;
  projectId: string;
  support: boolean;
}): Promise<CastVoteResult> {
  const { userId, projectId, support } = input;
  const choice = legacyBooleanToChoice(support);

  try {
    return await prisma.$transaction(async (tx) => {
      const now = new Date();
      const project = await tx.project.findUnique({
        where: { id: projectId },
        include: { votingPeriod: true },
      });

      if (!project?.votingPeriod) {
        return {
          success: false,
          previousVote: null,
          error: "No valid voting period found for this project",
        };
      }

      const { startAt, endAt } = project.votingPeriod;
      if (now < startAt || now > endAt) {
        return {
          success: false,
          previousVote: null,
          error: "Voting is not open for this project",
        };
      }

      const existing = await tx.vote.findUnique({
        where: {
          userId_projectId: { userId, projectId },
        },
      });

      const previousVote = existing
        ? choiceToLegacyBoolean(existing.choice)
        : null;

      await tx.vote.upsert({
        where: { userId_projectId: { userId, projectId } },
        create: { userId, projectId, choice },
        update: { choice },
      });

      return { success: true, previousVote };
    });
  } catch (e) {
    console.error("castVote failed:", e);
    return {
      success: false,
      previousVote: null,
      error: e instanceof Error ? e.message : "Failed to save vote",
    };
  }
}
