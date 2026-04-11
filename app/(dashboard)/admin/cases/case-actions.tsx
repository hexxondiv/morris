"use client";

import { useState, useTransition } from "react";
import { Case, CaseStatus, CaseWithDetails } from "@/types/case.types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Mail, Phone, Edit, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { fetchCaseById, updateCaseStatus, addCaseNote, acceptCase, rejectCase } from "@/lib/actions/cases";
import { formatDateSmart } from "@/lib/utils/date-time-formater";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { CheckCircle, XCircle } from "lucide-react";

interface CaseActionsProps {
  caseItem: Case;
}

const helpTypeLabels = {
  school_fees: "School Fees",
  educational_materials: "Educational Materials",
  infrastructure: "Infrastructure",
  scholarship: "Scholarship",
  health_welfare: "Health & Welfare",
  other: "Other",
};

export function CaseActions({ caseItem }: CaseActionsProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [caseDetails, setCaseDetails] = useState<CaseWithDetails | null>(null);
  const [newStatus, setNewStatus] = useState<CaseStatus>(caseItem.status);
  const [newNote, setNewNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleViewDetails = async () => {
    startTransition(async () => {
      const details = await fetchCaseById(caseItem.id);
      if (details) {
        setCaseDetails(details);
        setIsViewOpen(true);
      } else {
        toast.error("Failed to load case details");
      }
    });
  };

  const handleStatusChange = async () => {
    if (newStatus === caseItem.status) {
      setIsStatusOpen(false);
      return;
    }

    startTransition(async () => {
      const result = await updateCaseStatus(caseItem.id, newStatus);
      if (result.success) {
        toast.success("Case status updated successfully");
        setIsStatusOpen(false);
        // Trigger table refresh via global function
        if ((window as any).refreshCasesTable) {
          (window as any).refreshCasesTable();
        }
      } else {
        toast.error(result.error || "Failed to update status");
      }
    });
  };

  const handleContactEmail = () => {
    if (caseItem.email) {
      window.location.href = `mailto:${caseItem.email}?subject=RE: Case ${caseItem.case_reference_id}`;
    } else {
      toast.error("No email address available");
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }

    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    const adminName =
      (user.name?.trim() ||
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim()) ||
      "Admin";

    startTransition(async () => {
      const result = await addCaseNote(caseItem.id, newNote, user.id, adminName);
      if (result.success) {
        toast.success("Note added successfully");
        setNewNote("");
        // Refresh case details to show new note
        const details = await fetchCaseById(caseItem.id);
        if (details) {
          setCaseDetails(details);
        }
      } else {
        toast.error(result.error || "Failed to add note");
      }
    });
  };

  const handleAcceptCase = async () => {
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    const adminName =
      (user.name?.trim() ||
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim()) ||
      "Admin";

    startTransition(async () => {
      const result = await acceptCase(caseItem.id, user.id, adminName);
      if (result.success) {
        toast.success("Case accepted and moved to reviewing");
        // Trigger table refresh
        if ((window as any).refreshCasesTable) {
          (window as any).refreshCasesTable();
        }
      } else {
        toast.error(result.error || "Failed to accept case");
      }
    });
  };

  const handleRejectCase = async () => {
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    const adminName =
      (user.name?.trim() ||
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim()) ||
      "Admin";

    startTransition(async () => {
      const result = await rejectCase(caseItem.id, user.id, adminName);
      if (result.success) {
        toast.success("Case rejected and deleted");
        setIsRejectOpen(false);
        // Trigger table refresh
        if ((window as any).refreshCasesTable) {
          (window as any).refreshCasesTable();
        }
      } else {
        toast.error(result.error || "Failed to reject case");
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Show Accept/Reject for pending cases */}
          {caseItem.status === "pending" && (
            <>
              <DropdownMenuItem
                onClick={handleAcceptCase}
                disabled={isPending}
                className="text-green-600 focus:text-green-600"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Accept Case
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsRejectOpen(true)}
                disabled={isPending}
                className="text-red-600 focus:text-red-600"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Case
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onClick={handleViewDetails} disabled={isPending}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsStatusOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Change Status
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {caseItem.email && (
            <DropdownMenuItem onClick={handleContactEmail}>
              <Mail className="mr-2 h-4 w-4" />
              Email Reporter
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Case Details - {caseItem.case_reference_id}</DialogTitle>
            <DialogDescription>
              Submitted on {formatDateSmart(caseItem.created_at)}
            </DialogDescription>
          </DialogHeader>

          {caseDetails && (
            <div className="space-y-6">
              {/* Reporter Information */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <h3 className="font-semibold text-sm mb-2">Reporter Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {caseDetails.full_name}</p>
                    <p><span className="font-medium">Phone:</span> {caseDetails.phone}</p>
                    {caseDetails.email && (
                      <p><span className="font-medium">Email:</span> {caseDetails.email}</p>
                    )}
                    <p><span className="font-medium">Location:</span> {caseDetails.town}, {caseDetails.lga_name}, {caseDetails.state_name}</p>
                  </div>
                </div>

                {caseDetails.reporting_for === "someone_else" && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Beneficiary Information</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Name:</span> {caseDetails.beneficiary_name}</p>
                      <p><span className="font-medium">Relationship:</span> {caseDetails.relationship}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Case Details */}
              <div className="space-y-3">
                <h3 className="font-semibold">Case Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Help Type:</span> {helpTypeLabels[caseDetails.help_type]}</p>
                  <p><span className="font-medium">Status:</span> <span className="capitalize">{caseDetails.status}</span></p>
                  <div>
                    <span className="font-medium">Description:</span>
                    <p className="mt-1 p-3 bg-muted rounded">{caseDetails.description}</p>
                  </div>
                </div>
              </div>

              {/* Uploaded Files */}
              {caseDetails.files && caseDetails.files.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Uploaded Images</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {caseDetails.files.map((file) => (
                      <a
                        key={file.id}
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-square rounded-lg overflow-hidden border hover:border-theme-500 transition-colors"
                      >
                        <Image
                          src={file.file_url}
                          alt={file.file_name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-semibold flex items-center">
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Admin Notes
                </h3>

                {/* Notes List */}
                {caseDetails.notes && caseDetails.notes.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {caseDetails.notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 bg-muted rounded-lg text-sm space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-medium">{note.admin_name}</span>
                          <span>{formatDateSmart(note.created_at)}</span>
                        </div>
                        <p className="text-foreground">{note.note}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No notes yet</p>
                )}

                {/* Add Note Form */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={isPending || !newNote.trim()}
                    size="sm"
                    className="w-full"
                  >
                    {isPending ? "Adding..." : "Add Note"}
                  </Button>
                </div>
              </div>

              {/* Consent Information */}
              <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
                <p>✓ Information confirmed as truthful</p>
                <p>✓ Consented to be contacted</p>
                {caseDetails.updates_consent && <p>✓ Wants to receive updates</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Case Status</DialogTitle>
            <DialogDescription>
              Update the status for case {caseItem.case_reference_id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Status</label>
              <p className="text-sm text-muted-foreground capitalize">{caseItem.status}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">New Status</label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as CaseStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsStatusOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleStatusChange} disabled={isPending}>
                {isPending ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Case Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Case</DialogTitle>
            <DialogDescription>
              This will permanently delete case {caseItem.case_reference_id}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to reject and delete this case? This action is irreversible.
            </p>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectCase}
                disabled={isPending}
              >
                {isPending ? "Rejecting..." : "Reject & Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
