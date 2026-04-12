"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { markPledgeAsCompleted } from "@/lib/actions/pledge";
import type { Pledge } from "@/lib/columns/pledge-columns";

interface PledgeActionsProps {
  pledge: Pledge;
  setData?: React.Dispatch<React.SetStateAction<Pledge[]>>;
}

export function PledgeActions({ pledge, setData }: PledgeActionsProps) {
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onMarkAsCompleted = async () => {
    setIsSubmitting(true);

    let previousData: Pledge[] | null = null;

    if (setData) {
      setData((prevData) => {
        previousData = [...prevData];
        return prevData.map((item) =>
          item.id === pledge.id ? { ...item, status: "completed" } : item
        );
      });
    }

    try {
      const result = await markPledgeAsCompleted(
        pledge.id,
        pledge.user_id,
        pledge.project_id,
        pledge.amount
      );
      if (result.success) {
        toast.success("Pledge marked as completed and transaction recorded");
        setIsCompleteDialogOpen(false);
      } else {
        throw new Error(result.error || "Failed to mark pledge as completed");
      }
    } catch (error) {
      if (setData && previousData) {
        setData(previousData);
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to mark pledge as completed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex space-x-2">
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={pledge.status !== "pending" || isSubmitting}
            title="Mark as Completed"
            className="rounded-md border-gray-200 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-indigo-400"
          >
            <CheckCircle className="h-4 w-4 text-green-500" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark Pledge as Completed</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to mark the pledge of ${pledge.amount.toFixed(2)} from{" "}
            {pledge.user_email} as completed? This will create a transaction record.
          </p>
          <DialogFooter>
            <Button
              variant="default"
              onClick={onMarkAsCompleted}
              disabled={isSubmitting}
              className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
            >
              {isSubmitting ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
