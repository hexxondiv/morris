"use client";

import { useState } from "react";
import { VoteButton } from "@/components/components/vote-button";

interface VotingProject {
  id: string;
  title: string;
  description: string;
  goal_amount: number;
  cover_image: string | null;
  vote_count: number;
  oppose_count: number;
  has_voted: boolean;
  current_vote: boolean | null;
  start_date: string | null;
  end_date: string | null;
}

interface ProjectVoteSectionProps {
  project: VotingProject;
  canVote: boolean;
}

export function ProjectVoteSection({ project, canVote }: ProjectVoteSectionProps) {
  const [voteCount, setVoteCount] = useState(project.vote_count);
  const [opposeCount, setOpposeCount] = useState(project.oppose_count);

  const totalVotes = voteCount + opposeCount;
  const supportPercentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 50;
  const opposePercentage = totalVotes > 0 ? (opposeCount / totalVotes) * 100 : 50;

  const optimisticUpdate = (newVote: boolean, previousVote: boolean | null) => {
    if (previousVote === null) {
      if (newVote) setVoteCount((prev) => prev + 1);
      else setOpposeCount((prev) => prev + 1);
    } else if (newVote !== previousVote) {
      if (newVote) {
        setVoteCount((prev) => prev + 1);
        setOpposeCount((prev) => prev - 1);
      } else {
        setVoteCount((prev) => prev - 1);
        setOpposeCount((prev) => prev + 1);
      }
    }
  };

  const revertUpdate = (newVote: boolean, previousVote: boolean | null) => {
    if (previousVote === null) {
      if (newVote) setVoteCount((prev) => prev - 1);
      else setOpposeCount((prev) => prev - 1);
    } else if (newVote !== previousVote) {
      if (newVote) {
        setVoteCount((prev) => prev - 1);
        setOpposeCount((prev) => prev + 1);
      } else {
        setVoteCount((prev) => prev + 1);
        setOpposeCount((prev) => prev - 1);
      }
    }
  };

  return (
    <>
      <div className="space-y-2 mb-3 sm:mb-4">
        <div className="flex items-center justify-between text-xs sm:text-sm text-stone-200">
          <span>Support {Math.round(supportPercentage)}%</span>
          <span>Oppose {Math.round(opposePercentage)}%</span>
        </div>
        <div className="w-full bg-stone-100 rounded-full h-2 sm:h-2.5 flex overflow-hidden">
          <div
            className="bg-lime h-2 sm:h-2.5"
            style={{ width: `${supportPercentage}%` }}
          />
          <div
            className="bg-coral-500 h-2 sm:h-2.5"
            style={{ width: `${opposePercentage}%` }}
          />
        </div>
      </div>
      <VoteButton
        projectId={project.id}
        hasVoted={project.has_voted}
        currentVote={project.current_vote}
        canVote={canVote}
        startDate={project.start_date}
        endDate={project.end_date}
        optimisticUpdate={optimisticUpdate}
        revertUpdate={revertUpdate}
      />
    </>
  );
}