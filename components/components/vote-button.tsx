"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { saveVote } from "@/lib/actions";
import { format } from "date-fns";

interface VoteButtonProps {
  projectId: string;
  hasVoted: boolean;
  currentVote: boolean | null;
  canVote: boolean;
  startDate: string | null;
  endDate: string | null;
  optimisticUpdate: (newVote: boolean, previousVote: boolean | null) => void;
  revertUpdate: (newVote: boolean, previousVote: boolean | null) => void;
}

export function VoteButton({
  projectId,
  hasVoted,
  currentVote,
  canVote,
  startDate,
  endDate,
  optimisticUpdate,
  revertUpdate,
}: VoteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [userVote, setUserVote] = useState(currentVote);
  const { userId } = useAuth();

  useEffect(() => {
    setUserVote(currentVote);
  }, [currentVote]);

  const getVotingStatus = () => {
    if (!startDate || !endDate) return "invalid";
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (now < start) return "future";
    if (now > end) return "ended";
    return "open";
  };

  const handleVote = (vote: boolean) => {
    if (!userId) return toast.error("Please sign in to vote");
    if (!canVote) return toast.error("You need a completed donation to vote");
    if (getVotingStatus() !== "open") return toast.error("Voting period is not open");
    if (userVote === vote) return toast.info("You've already voted this way");
    startTransition(async () => {
      const previousVote = userVote;
      setUserVote(vote);
      optimisticUpdate(vote, previousVote);
    if (!projectId) return;
      try {
        const result = await saveVote(projectId, vote);
        if (!result.success) throw new Error(result.error || "Failed to submit vote");
        toast.success(`Vote ${vote ? "in support" : "in opposition"} ${result.previousVote !== null ? "updated" : "submitted"} successfully`);
      } catch (error) {
        setUserVote(previousVote);
        revertUpdate(vote, previousVote);
        toast.error(error instanceof Error ? error.message : "Failed to submit vote");
      }
    });
  };

  const votingStatus = getVotingStatus();
  const formattedStartDate = startDate ? format(new Date(startDate), "MMM d, yyyy, h:mm a") : "N/A";

  const periodStatusMessage = () => {
    switch (votingStatus) {
      case "future":
        return `Voting starts on ${formattedStartDate}`;
      case "ended":
        return "Voting has ended";
      case "invalid":
        return "Voting period is invalid";
      default:
        return null;
    }
  };

  const voteStatusText = hasVoted
    ? `You voted: ${userVote ? "Support" : "Oppose"}`
    : votingStatus === "ended"
    ? "You did not vote"
    : "You haven’t voted";

  return (
    <div className="space-y-2">
      {votingStatus === "open" ? (
        <div className="flex sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleVote(true)}
            disabled={isPending || !canVote}
            className={`flex-1 text-xs sm:text-sm transition-all ${userVote === true ? "bg-lime text-theme-50 border-lime" : "bg-theme-50 border-stone-100 text-theme-700 hover:bg-theme-100 hover:border-theme-300"}`}
          >
            <ThumbsUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-lime" />
            Support
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleVote(false)}
            disabled={isPending || !canVote}
            className={`flex-1 text-xs sm:text-sm transition-all ${userVote === false ? "bg-coral-500 text-theme-50 border-coral-500" : "bg-theme-50 border-stone-100 text-theme-700 hover:bg-coral-400/20 hover:border-coral-400"}`}
          >
            <ThumbsDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-coral-500" />
            Oppose
          </Button>
        </div>
      ) : (
        <div className="text-xs sm:text-sm text-center text-stone-200">
          {periodStatusMessage()}
        </div>
      )}
      <div className="text-xs sm:text-sm text-center">
        <span
          className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
            hasVoted
              ? userVote
                ? "bg-lime/20 text-lime"
                : "bg-coral-500/20 text-coral-500"
              : votingStatus === "ended"
              ? "bg-stone-100 text-stone-500"
              : "text-stone-200"
          }`}
        >
          {voteStatusText}
        </span>
      </div>
    </div>
  );
}