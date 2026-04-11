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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
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
