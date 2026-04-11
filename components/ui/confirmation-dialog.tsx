"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface TransactionDetails {
  type: "expense" | "deployment";
  amount: string;
  description: string;
  paymentRef: string;
  chartName?: string;
  projectName?: string;
  timelineStageName?: string;
  currency: string;
}

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
  details: TransactionDetails;
}

export function TransactionConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  details,
}: ConfirmationDialogProps) {
  const formatAmount = (amount: string, currency: string) => {
    const numAmount = parseFloat(amount);
    return `${currency === "NGN" ? "₦" : currency}${numAmount.toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <DialogTitle className="text-xl">
            Confirm Transaction
          </DialogTitle>
          <DialogDescription className="text-left">
            Please review the transaction details before proceeding:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-6">
          {/* Transaction Type */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="font-medium text-gray-600 dark:text-gray-400">Type:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
              {details.type}
            </span>
          </div>

          {/* Amount */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="font-medium text-gray-600 dark:text-gray-400">Amount:</span>
            <span className="font-bold text-lg text-red-600 dark:text-red-400">
              {formatAmount(details.amount, details.currency)}
            </span>
          </div>

          {/* Chart */}
          {details.chartName && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="font-medium text-gray-600 dark:text-gray-400">Chart:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {details.chartName}
              </span>
            </div>
          )}

          {/* Project (for deployment) */}
          {details.projectName && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="font-medium text-gray-600 dark:text-gray-400">Project:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {details.projectName}
              </span>
            </div>
          )}

          {/* Timeline Stage (for deployment) */}
          {details.timelineStageName && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="font-medium text-gray-600 dark:text-gray-400">Timeline Stage:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {details.timelineStageName}
              </span>
            </div>
          )}

          {/* Payment Reference */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="font-medium text-gray-600 dark:text-gray-400">Reference:</span>
            <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
              {details.paymentRef}
            </span>
          </div>

          {/* Description */}
          <div className="py-2">
            <span className="font-medium text-gray-600 dark:text-gray-400 block mb-2">Description:</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              {details.description}
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Transaction"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}