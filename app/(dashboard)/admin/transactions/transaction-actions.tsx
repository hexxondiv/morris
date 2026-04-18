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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Eye, 
  RefreshCw, 
  Ban, 
  CheckCircle,
  AlertTriangle 
} from "lucide-react";
import { Transaction } from "@/types/transaction";

interface TransactionActionsProps {
  transaction: Transaction;
  setData?: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

export function TransactionActions({ transaction, setData }: TransactionActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"details" | "refund" | "retry" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReverifying, setIsReverifying] = useState(false);

  const canSwitchReverify =
    transaction.payment_type === "pledge" && Boolean(transaction.payment_ref);

  const showRequerySwitchButton =
    transaction.payment_status !== "completed" &&
    transaction.payment_type !== "expense";

  const onReverifySwitch = async () => {
    if (!canSwitchReverify) return;
    setIsReverifying(true);
    try {
      const res = await fetch("/api/admin/transactions/reverify-switch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: transaction.id }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        switchStatus?: string;
        pledgeStatus?: string | null;
        transactionStatus?: string | null;
      };
      if (!res.ok) {
        toast.error(payload.error || "Re-query failed");
        return;
      }
      const ts = payload.transactionStatus as Transaction["payment_status"] | undefined;
      if (ts === "completed") {
        toast.success("Switch confirms payment; transaction and pledge updated.", {
          description: `Switch: ${payload.switchStatus ?? "unknown"}`,
        });
        if (setData && ts) {
          setData((prev) =>
            prev.map((row) =>
              row.id === transaction.id
                ? {
                    ...row,
                    payment_status: ts,
                    updated_at: new Date().toISOString(),
                  }
                : row
            )
          );
        }
      } else {
        toast.info("Switch status refreshed", {
          description: `Switch: ${payload.switchStatus ?? "unknown"} · Transaction: ${payload.transactionStatus ?? "-"}${payload.pledgeStatus ? ` · Pledge: ${payload.pledgeStatus}` : ""}`,
        });
        if (setData && ts) {
          setData((prev) =>
            prev.map((row) =>
              row.id === transaction.id
                ? {
                    ...row,
                    payment_status: ts,
                    updated_at: new Date().toISOString(),
                  }
                : row
            )
          );
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Re-query request failed");
    } finally {
      setIsReverifying(false);
    }
  };

  const handleStatusUpdate = async (newStatus: Transaction["payment_status"]) => {
    setIsSubmitting(true);
    
    // Optimistic update
    if (setData) {
      setData(prev => 
        prev.map(item => 
          item.id === transaction.id 
            ? { ...item, payment_status: newStatus, updated_at: new Date().toISOString() }
            : item
        )
      );
    }

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update transaction');
      
      toast.success(`Transaction ${newStatus} successfully`);
    } catch (error) {
      // Revert optimistic update
      if (setData) {
        setData(prev => 
          prev.map(item => 
            item.id === transaction.id 
              ? { ...item, payment_status: transaction.payment_status }
              : item
          )
        );
      }
      toast.error('Failed to update transaction');
    } finally {
      setIsSubmitting(false);
      setIsDialogOpen(false);
    }
  };

  const openDialog = (type: typeof dialogType) => {
    setDialogType(type);
    setIsDialogOpen(true);
  };

  return (
    <>
      <div
        className="inline-flex items-center rounded-md border border-input shadow-sm"
        role="group"
        aria-label="Transaction actions"
      >
        {showRequerySwitchButton && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-none rounded-l-md border-0 border-r border-input shadow-none"
            disabled={!canSwitchReverify || isReverifying || isSubmitting}
            title={
              canSwitchReverify
                ? "Re-query Switch (verify payment; updates pledge if paid)"
                : "Only pledge rows with a Switch payment reference can be re-queried"
            }
            aria-label="Re-query Switch payment status"
            onClick={onReverifySwitch}
          >
            <RefreshCw
              className={`h-4 w-4 text-sky-600 dark:text-sky-400 ${isReverifying ? "animate-spin" : ""}`}
            />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={
                showRequerySwitchButton
                  ? "h-8 w-8 shrink-0 rounded-none rounded-r-md border-0 shadow-none"
                  : "h-8 w-8 shrink-0 rounded-md border-0 shadow-none"
              }
              disabled={isReverifying}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => openDialog("details")}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          
          {transaction.payment_status === "failed" && (
            <DropdownMenuItem onClick={() => openDialog("retry")}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Payment
            </DropdownMenuItem>
          )}
          
          {transaction.payment_status === "completed" && (
            <DropdownMenuItem disabled onClick={() => openDialog("refund")}>
              <Ban className="mr-2 h-4 w-4" />
              Process Refund
            </DropdownMenuItem>
          )}
          
          {transaction.payment_status === "pending" && (
            <DropdownMenuItem disabled onClick={() => handleStatusUpdate("completed")}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark Completed
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "details" && "Transaction Details"}
              {dialogType === "refund" && "Process Refund"}
              {dialogType === "retry" && "Retry Payment"}
            </DialogTitle>
          </DialogHeader>
          
          {dialogType === "details" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Transaction ID:</strong> {transaction.id}</div>
                <div><strong>Payment Ref:</strong> {transaction.payment_ref || "N/A"}</div>
                <div><strong>User:</strong> {transaction.user_email || transaction.user_id}</div>
                <div><strong>Amount:</strong> {transaction.currency} {transaction.amount.toLocaleString()}</div>
                <div><strong>Payment Method:</strong> {transaction.payment_method || "N/A"}</div>
                <div><strong>Category:</strong> {transaction.category || "N/A"}</div>
                <div><strong>Created:</strong> {new Date(transaction.created_at).toLocaleString()}</div>
                <div><strong>Paid At:</strong> {new Date(transaction.paid_at).toLocaleString()}</div>
              </div>
              
              {transaction.metadata && (
                <div>
                  <strong>Metadata:</strong>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm mt-1 overflow-auto">
                    {JSON.stringify(transaction.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          
          {dialogType === "refund" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                <span>This action cannot be undone</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to process a refund for {transaction.currency} {transaction.amount.toLocaleString()}?
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleStatusUpdate("refunded")}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isSubmitting ? "Processing..." : "Process Refund"}
                </Button>
              </DialogFooter>
            </div>
          )}
          
          {dialogType === "retry" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Retry the failed payment for {transaction.currency} {transaction.amount.toLocaleString()}?
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleStatusUpdate("pending")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Retry Payment"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
