// components/timeline/timeline-management.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Check,
  Clock,
  DollarSign,
  Calendar,
  Upload,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency, cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";

interface TimelineStage {
  id: string;
  title: string;
  description: string | null;
  planned_cost: number;
  actual_cost: number | null;
  stage_order: number;
  status: "pending" | "in_progress" | "completed" | "skipped";
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  completion_notes: string | null;
  media_urls: string[];
  completion_media_urls: string[];
}

interface TimelineManagementProps {
  projectSlug: string;
  projectStatus: string;
  isAdminView: boolean;
}

interface StageFormData {
  title: string;
  description: string;
  planned_cost: string;
  planned_start_date: string;
  planned_end_date: string;
  media_urls: string[];
}

interface CompletionFormData {
  actual_cost: string;
  completion_notes: string;
  completion_media_urls: string[];
  actual_end_date: string;
}

export default function TimelineManagement({
  projectSlug,
  projectStatus,
  isAdminView,
}: TimelineManagementProps) {
  const [timeline, setTimeline] = useState<TimelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [selectedStage, setSelectedStage] = useState<TimelineStage | null>(
    null
  );
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  // Form states
  const [stages, setStages] = useState<StageFormData[]>([
    {
      title: "",
      description: "",
      planned_cost: "",
      planned_start_date: "",
      planned_end_date: "",
      media_urls: [],
    },
  ]);
  const [completionForm, setCompletionForm] = useState<CompletionFormData>({
    actual_cost: "",
    completion_notes: "",
    completion_media_urls: [],
    actual_end_date: new Date().toISOString().split("T")[0],
  });

  // Fetch timeline data
  useEffect(() => {
    fetchTimeline();
  }, [projectSlug]);

  const fetchTimeline = async () => {
    try {
      const response = await fetch(`/api/projects/${projectSlug}/timeline`);
      if (!response.ok) throw new Error("Failed to fetch timeline");

      const data = await response.json();
      setTimeline(data.timeline || []);
    } catch (error) {
      console.error("Error fetching timeline:", error);
      toast.error("Failed to load timeline");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTimeline = async () => {
    if (!stages.some((stage) => stage.title.trim())) {
      toast.error("At least one stage with a title is required");
      return;
    }

    setCreating(true);
    try {
      const validStages = stages.filter((stage) => stage.title.trim());

      const response = await fetch(`/api/projects/${projectSlug}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages: validStages }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create timeline");
      }

      toast.success("Timeline created successfully");
      setShowCreateForm(false);
      setStages([
        {
          title: "",
          description: "",
          planned_cost: "",
          planned_start_date: "",
          planned_end_date: "",
          media_urls: [],
        },
      ]);
      await fetchTimeline();
    } catch (error: any) {
      console.error("Error creating timeline:", error);
      toast.error(error.message || "Failed to create timeline");
    } finally {
      setCreating(false);
    }
  };

  const handleCompleteStage = async () => {
    if (!selectedStage) return;

    try {
      const response = await fetch(
        `/api/projects/${projectSlug}/timeline/${selectedStage.id}/complete`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(completionForm),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to complete stage");
      }

      toast.success("Stage completed successfully");
      setShowCompleteForm(false);
      setSelectedStage(null);
      setCompletionForm({
        actual_cost: "",
        completion_notes: "",
        completion_media_urls: [],
        actual_end_date: new Date().toISOString().split("T")[0],
      });
      await fetchTimeline();
    } catch (error: any) {
      console.error("Error completing stage:", error);
      toast.error(error.message || "Failed to complete stage");
    }
  };

  const addStage = () => {
    setStages([
      ...stages,
      {
        title: "",
        description: "",
        planned_cost: "",
        planned_start_date: "",
        planned_end_date: "",
        media_urls: [],
      },
    ]);
  };

  const removeStage = (index: number) => {
    if (stages.length > 1) {
      setStages(stages.filter((_, i) => i !== index));
    }
  };

  const updateStage = (
    index: number,
    field: keyof StageFormData,
    value: string
  ) => {
    const updated = [...stages];
    updated[index] = { ...updated[index], [field]: value };
    setStages(updated);
  };

  const toggleStageExpansion = (stageId: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId);
    } else {
      newExpanded.add(stageId);
    }
    setExpandedStages(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="w-4 h-4 text-white" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-600 border-green-600";
      case "in_progress":
        return "bg-blue-50 border-blue-600";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  const canCompleteStage = (stage: TimelineStage) => {
    if (stage.status === "completed" || stage.status === "pending")
      return false;
    if (stage.stage_order === 1) return true;

    if (stage.status === "in_progress") return true;

    // Check if previous stage is completed
    const previousStage = timeline.find(
      (s) => s.stage_order === stage.stage_order - 1
    );
    return (
      previousStage?.status === "completed" ||
      previousStage?.status === "in_progress"
    );
  };

  const totalPlannedCost = timeline.reduce(
    (sum, stage) => sum + stage.planned_cost,
    0
  );
  const totalActualCost = timeline.reduce(
    (sum, stage) => sum + (stage.actual_cost || 0),
    0
  );
  const completedStages = timeline.filter(
    (stage) => stage.status === "completed"
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              Project Timeline
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Track project implementation stages and progress
            </p>
          </div>
          {isAdminView &&
            projectStatus === "active" &&
            timeline.length === 0 && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Timeline
              </Button>
            )}
        </CardHeader>

        {timeline.length > 0 && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {completedStages}/{timeline.length}
                </div>
                <div className="text-sm text-gray-600">Stages Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalActualCost)}
                </div>
                <div className="text-sm text-gray-600">Total Spent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalPlannedCost)}
                </div>
                <div className="text-sm text-gray-600">Total Planned</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Timeline Stages */}
      {timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Implementation Stages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeline.map((stage, index) => {
                const isExpanded = expandedStages.has(stage.id);
                const isLast = index === timeline.length - 1;

                return (
                  <div key={stage.id} className="relative">
                    {/* Timeline Line */}
                    {!isLast && (
                      <div className="absolute left-6 top-14 w-px h-full border-l border-dashed border-gray-300 z-0" />
                    )}

                    <div className="flex items-start gap-4 relative z-10 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                      {/* Status Icon */}
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1",
                          getStatusColor(stage.status)
                        )}
                      >
                        {getStatusIcon(stage.status)}
                      </div>

                      {/* Content */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <button
                            onClick={() => toggleStageExpansion(stage.id)}
                            className="flex items-center gap-2 text-left hover:text-primary transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <h3 className="text-lg font-medium text-gray-900">
                              {stage.title}
                            </h3>
                          </button>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                stage.status === "completed"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {stage.status.replace("_", " ")}
                            </Badge>
                            {isAdminView &&
                              canCompleteStage(stage) &&
                              stage.status !== "completed" && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedStage(stage);
                                    setCompletionForm({
                                      actual_cost:
                                        stage.actual_cost?.toString() ||
                                        stage.planned_cost.toString(),
                                      completion_notes: "",
                                      completion_media_urls: [],
                                      actual_end_date: new Date()
                                        .toISOString()
                                        .split("T")[0],
                                    });
                                    setShowCompleteForm(true);
                                  }}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Complete
                                </Button>
                              )}
                          </div>
                        </div>

                        {/* Basic Info - Always Visible */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center gap-1">
                            Planned: {formatCurrency(stage.planned_cost)}
                          </span>
                          {stage.actual_cost && (
                            <span className="flex items-center gap-1">
                              Actual: {formatCurrency(stage.actual_cost)}
                            </span>
                          )}
                          {stage.planned_start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(stage.planned_start_date)}
                            </span>
                          )}
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="mt-4 space-y-4">
                            {stage.description && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1">
                                  Description
                                </h4>
                                <p className="text-gray-700">
                                  {stage.description}
                                </p>
                              </div>
                            )}

                            {stage.completion_notes && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1">
                                  Completion Notes
                                </h4>
                                <p className="text-gray-700">
                                  {stage.completion_notes}
                                </p>
                              </div>
                            )}

                            {/* Timeline Dates */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {stage.planned_start_date && (
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-1">
                                    Planned Timeline
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {formatDate(stage.planned_start_date)} -{" "}
                                    {stage.planned_end_date
                                      ? formatDate(stage.planned_end_date)
                                      : "Ongoing"}
                                  </p>
                                </div>
                              )}
                              {stage.actual_start_date && (
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-1">
                                    Actual Timeline
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {new Date(
                                      stage.actual_start_date
                                    ).toLocaleDateString()}{" "}
                                    -{" "}
                                    {stage.actual_end_date
                                      ? new Date(
                                          stage.actual_end_date
                                        ).toLocaleDateString()
                                      : "In Progress"}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Media Gallery */}
                            {stage.completion_media_urls.length > 0 && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">
                                  Progress Photos
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {stage.completion_media_urls
                                    .slice(0, 8)
                                    .map((url, i) => (
                                      <div
                                        key={i}
                                        className="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
                                      >
                                        <Image
                                          src={url}
                                          alt={`${stage.title} progress ${
                                            i + 1
                                          }`}
                                          fill
                                          className="object-cover hover:scale-105 transition-transform cursor-pointer"
                                          sizes="(max-width: 768px) 50vw, 25vw"
                                        />
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {timeline.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Timeline Created
            </h3>
            <p className="text-gray-600 mb-4">
              {projectStatus === "active"
                ? "Create implementation stages to track project progress."
                : "Timeline stages will be available when the project becomes active."}
            </p>
            {isAdminView && projectStatus === "active" && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Timeline
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Timeline Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Project Timeline</DialogTitle>
            <DialogDescription>
              Define the implementation stages for this project. Stages will be
              completed sequentially.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {stages.map((stage, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Stage {index + 1}</CardTitle>
                  {stages.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStage(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor={`title-${index}`}>Stage Title *</Label>
                    <Input
                      id={`title-${index}`}
                      value={stage.title}
                      onChange={(e) =>
                        updateStage(index, "title", e.target.value)
                      }
                      placeholder="e.g., Foundation Construction"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`description-${index}`}>Description</Label>
                    <Textarea
                      id={`description-${index}`}
                      value={stage.description}
                      onChange={(e) =>
                        updateStage(index, "description", e.target.value)
                      }
                      placeholder="Describe what will be done in this stage"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`cost-${index}`}>Planned Cost</Label>
                      <Input
                        id={`cost-${index}`}
                        type="number"
                        step="0.01"
                        value={stage.planned_cost}
                        onChange={(e) =>
                          updateStage(index, "planned_cost", e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`start-${index}`}>Start Date</Label>
                      <Input
                        id={`start-${index}`}
                        type="date"
                        value={stage.planned_start_date}
                        onChange={(e) =>
                          updateStage(
                            index,
                            "planned_start_date",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`end-${index}`}>End Date</Label>
                      <Input
                        id={`end-${index}`}
                        type="date"
                        value={stage.planned_end_date}
                        onChange={(e) =>
                          updateStage(index, "planned_end_date", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" onClick={addStage} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Another Stage
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTimeline} disabled={creating}>
              {creating ? "Creating..." : "Create Timeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Stage Dialog */}
      <Dialog open={showCompleteForm} onOpenChange={setShowCompleteForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Stage: {selectedStage?.title}</DialogTitle>
            <DialogDescription>
              Mark this stage as completed and provide actual details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="actual_cost">Actual Cost</Label>
              <div className="relative">
                <Input
                  id="actual_cost"
                  type="number"
                  step="0.01"
                  value={selectedStage?.actual_cost || 0}
                  disabled={true}
                  className="bg-muted"
                  placeholder={selectedStage?.planned_cost?.toString()}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Actual costs are automatically calculated from expenditure
                transactions.
                <span className="font-medium">
                  Current total:{" "}
                  {formatCurrency(selectedStage?.actual_cost || 0)}
                </span>
              </p>
            </div>

            <div>
              <Label htmlFor="completion_notes">Completion Notes</Label>
              <Textarea
                id="completion_notes"
                value={completionForm.completion_notes}
                onChange={(e) =>
                  setCompletionForm((prev) => ({
                    ...prev,
                    completion_notes: e.target.value,
                  }))
                }
                placeholder="Describe what was accomplished, any challenges, etc."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="actual_end_date">Completion Date</Label>
              <Input
                id="actual_end_date"
                type="date"
                value={completionForm.actual_end_date}
                onChange={(e) =>
                  setCompletionForm((prev) => ({
                    ...prev,
                    actual_end_date: e.target.value,
                  }))
                }
              />
            </div>

            {/* Cost variance indicator */}
            {selectedStage?.planned_cost != null && (
              <div className="p-3 rounded-md bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span>Planned Cost:</span>
                  <span>{formatCurrency(selectedStage.planned_cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Actual Cost:</span>
                  <span>{formatCurrency(selectedStage.actual_cost ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t pt-1 mt-1">
                  <span>Variance:</span>
                  <span
                    className={
                      (selectedStage.actual_cost ?? 0) -
                        selectedStage.planned_cost >
                      0
                        ? "text-coral-500"
                        : "text-lime"
                    }
                  >
                    {formatCurrency(
                      Math.abs(
                        (selectedStage.actual_cost ?? 0) -
                          selectedStage.planned_cost
                      )
                    )}
                    {(selectedStage.actual_cost ?? 0) -
                      selectedStage.planned_cost >
                    0
                      ? " over"
                      : " under"}
                  </span>
                </div>
              </div>
            )}

            {/* TODO: Add image upload functionality for completion_media_urls */}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompleteForm(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCompleteStage}>Complete Stage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
