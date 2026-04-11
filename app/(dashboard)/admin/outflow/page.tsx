"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronDown,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Sparkles,
  Receipt,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { createChart, getCharts, getSuggestedChartCode } from "@/lib/actions/chart";
import { getProjectTimelineById } from "@/lib/actions/timeline";
import { TransactionConfirmationDialog } from "@/components/ui/confirmation-dialog";

const useSetting = (setting: string) => "NGN";

// Type definitions
interface Chart {
  id: string;
  code: string;
  name: string;
  chart_type: "expense" | "deployment";
  public_name: string;
  description: string;
  created_at?: string;
}

interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: "active";
}

interface TimelineStageForm {
  title: string;
  description: string;
  planned_cost: string;
  planned_start_date: string;
  planned_end_date: string;
  stage_order: string;
}

interface CreateTimelineStageData {
  title: string;
  description?: string;
  planned_cost: string;
  planned_start_date?: string;
  planned_end_date?: string;
  stage_order: number;
  media_urls?: string[];
}

interface TimelineStage {
  id: string;
  title: string;
  description?: string;
  planned_cost: number;
  planned_start_date?: string;
  planned_end_date?: string;
  stage_order: number;
  status: "pending" | "in_progress" | "completed";
  actual_start_date?: string;
}

interface FormData {
  type: "expense" | "deployment" | "";
  chartId: string;
  projectId: string;
  timelineStageId: string;
  amount: string;
  description: string;
  paymentRef: string;
}

interface FormErrors {
  type?: string;
  chartId?: string;
  projectId?: string;
  timelineStageId?: string;
  amount?: string;
  description?: string;
  paymentRef?: string;
}

interface LoadingStates {
  projects: boolean;
  timelineStages: boolean;
  submitting: boolean;
  creatingTimeline: boolean;
  creatingChart: boolean;
}

interface ErrorStates {
  projects: string | null;
  timelineStages: string | null;
}

// Chart Creation Dialog Component
function CreateChartDialog({
  open,
  onOpenChange,
  transactionType,
  onChartCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionType: "expense" | "deployment";
  onChartCreated: (chart: Chart) => void;
}) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    public_name: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedCode, setSuggestedCode] = useState<string>("");

  // Get suggested chart code when dialog opens
  useEffect(() => {
    if (open) {
      getSuggestedCode();
    }
  }, [open, transactionType]);

  const getSuggestedCode = async () => {
    try {
      const suggested = await getSuggestedChartCode(transactionType);
      setSuggestedCode(suggested);
    } catch (error) {
      console.error("Error getting suggested code:", error);
    }
  };

  const useSuggestedCode = () => {
    setFormData(prev => ({ ...prev, code: suggestedCode }));
    if (errors.code) setErrors(prev => ({ ...prev, code: "" }));
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      public_name: "",
      description: "",
    });
    setErrors({});
    setSuggestedCode("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.code.trim()) newErrors.code = "Chart code is required";
    if (!formData.name.trim()) newErrors.name = "Chart name is required";
    if (!formData.public_name.trim()) newErrors.public_name = "Public name is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    
    // Add chart code validation based on type
    if (formData.code.trim()) {
      const codePrefix = transactionType === "expense" ? "EXP" : "DEP";
      if (!formData.code.toUpperCase().startsWith(codePrefix)) {
        newErrors.code = `Must start with "${codePrefix}" (e.g., ${codePrefix}001)`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Create FormData for server action
      const submitData = new FormData();
      submitData.append("code", formData.code);
      submitData.append("name", formData.name);
      submitData.append("public_name", formData.public_name);
      submitData.append("description", formData.description);
      submitData.append("chart_type", transactionType);

      const result = await createChart(submitData);

      if (!result.success) {
        if (result.fieldErrors) {
          const newErrors: Record<string, string> = {};
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            newErrors[field] = messages[0];
          });
          setErrors(newErrors);
        } else {
          toast.error(result.error || "Failed to create chart");
        }
        return;
      }

      const newChart: Chart = {
        id: result.data!.id,
        code: result.data!.code,
        name: result.data!.name,
        public_name: result.data!.public_name,
        description: result.data!.description,
        chart_type: result.data!.chart_type,
        created_at: result.data!.created_at,
      };

      onChartCreated(newChart);
      toast.success(`${transactionType} chart created successfully!`);
      handleClose();
    } catch (error) {
      console.error("Error creating chart:", error);
      toast.error("Failed to create chart. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const chartTypeIcon = transactionType === "expense" ? Receipt : Rocket;
  const ChartTypeIcon = chartTypeIcon;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Simplified Header */}
        <div className="bg-theme-500 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChartTypeIcon className="w-5 h-5" />
            <h2 className="font-semibold">Create {transactionType} Chart</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Form */}
        <div className="p-6 space-y-4">
          {/* Chart Code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-p-dark">Chart Code *</label>
              {suggestedCode && (
                <button
                  type="button"
                  onClick={useSuggestedCode}
                  className="text-xs px-2 py-1 bg-theme-100 text-theme-700 rounded hover:bg-theme-200 transition-colors"
                >
                  Use {suggestedCode}
                </button>
              )}
            </div>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, code: e.target.value }));
                if (errors.code) setErrors(prev => ({ ...prev, code: "" }));
              }}
              placeholder={`${transactionType === "expense" ? "EXP" : "DEP"}001`}
              className="w-full p-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-all"
            />
            {errors.code && <p className="text-coral-500 text-xs">{errors.code}</p>}
          </div>

          {/* Chart Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-p-dark">Chart Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }));
                if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
              }}
              placeholder="Internal chart name"
              className="w-full p-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-all"
            />
            {errors.name && <p className="text-coral-500 text-xs">{errors.name}</p>}
          </div>

          {/* Public Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-p-dark">Public Name *</label>
            <input
              type="text"
              value={formData.public_name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, public_name: e.target.value }));
                if (errors.public_name) setErrors(prev => ({ ...prev, public_name: "" }));
              }}
              placeholder="Name visible to public"
              className="w-full p-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-all"
            />
            {errors.public_name && <p className="text-coral-500 text-xs">{errors.public_name}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-p-dark">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }));
                if (errors.description) setErrors(prev => ({ ...prev, description: "" }));
              }}
              placeholder="Brief description"
              rows={2}
              className="w-full p-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent resize-none transition-all"
            />
            {errors.description && <p className="text-coral-500 text-xs">{errors.description}</p>}
          </div>
        </div>

        {/* Compact Footer */}
        <div className="px-6 py-4 bg-stone-50 flex gap-3">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 text-sm border border-stone-200 rounded-lg text-p-dark hover:bg-stone-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 text-sm bg-theme-600 text-white rounded-lg hover:bg-theme-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Chart"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Status order mapping for consistent sorting
const STATUS_ORDER: Record<TimelineStage["status"], number> = {
  completed: 1,
  in_progress: 2,
  pending: 3,
};

// Utility function to sort timeline stages consistently
const sortTimelineStages = (stages: TimelineStage[]): TimelineStage[] => {
  return stages.sort((a, b) => {
    if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    }
    return a.stage_order - b.stage_order;
  });
};

// Timeline Creation Component
function TimelineCreationForm({
  show,
  onCancel,
  onSave,
  isLoading,
  existingStages,
}: {
  show: boolean;
  onCancel: () => void;
  onSave: (stages: CreateTimelineStageData[]) => Promise<void>;
  isLoading: boolean;
  existingStages: TimelineStage[];
}) {
  const [stages, setStages] = useState<TimelineStageForm[]>([]);

  const getNextStageOrder = (): number => {
    if (existingStages.length === 0) return 1;
    const maxOrder = Math.max(...existingStages.map((s) => s.stage_order));
    return maxOrder + 1;
  };

  useEffect(() => {
    if (show) {
      const initialStageOrder = getNextStageOrder();
      setStages([
        {
          title: "",
          description: "",
          planned_cost: "",
          planned_start_date: "",
          planned_end_date: "",
          stage_order: initialStageOrder.toString(),
        },
      ]);
    }
  }, [show, existingStages.length]);

  const addStage = () => {
    const currentMaxOrder = Math.max(
      getNextStageOrder() - 1,
      ...stages.map((s) => parseInt(s.stage_order)).filter((o) => !isNaN(o))
    );
    const nextOrder = currentMaxOrder + 1;

    setStages([
      ...stages,
      {
        title: "",
        description: "",
        planned_cost: "",
        planned_start_date: "",
        planned_end_date: "",
        stage_order: nextOrder.toString(),
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
    field: keyof TimelineStageForm,
    value: string
  ) => {
    const updated = [...stages];
    updated[index] = { ...updated[index], [field]: value };
    setStages(updated);
  };

  const handleSave = async () => {
    const validStages = stages.filter((stage) => stage.title.trim());
    if (validStages.length === 0) {
      toast.error("Please add at least one stage with a title");
      return;
    }

    const timelineData: CreateTimelineStageData[] = validStages.map(
      (stage) => ({
        title: stage.title,
        description: stage.description || undefined,
        planned_cost: stage.planned_cost || "0",
        planned_start_date: stage.planned_start_date || undefined,
        planned_end_date: stage.planned_end_date || undefined,
        stage_order: parseInt(stage.stage_order) || getNextStageOrder(),
      })
    );
    await onSave(timelineData);
  };

  if (!show) return null;

  return (
    <div className="space-y-6 animate-in slide-in-from-top duration-300">
      <div className="bg-gradient-to-br from-theme-50 to-theme-100 border-2 border-theme-200 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-theme-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-theme-900">
                Create Timeline Stages
              </h3>
              <p className="text-theme-700 text-sm">
                Add new stages to track project progress
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div
              key={index}
              className="bg-white border border-theme-200 rounded-xl p-5 shadow-sm animate-in fade-in duration-200"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-theme-100 rounded-full flex items-center justify-center">
                    <span className="text-theme-600 font-semibold text-sm">
                      {stage.stage_order}
                    </span>
                  </div>
                  <h4 className="font-semibold text-p-dark">
                    Stage {stage.stage_order}
                  </h4>
                </div>
                {stages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStage(index)}
                    className="text-coral-400 hover:text-coral-600 p-1 rounded-lg hover:bg-coral-50 transition-colors"
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-p-dark mb-2">
                      Stage Title *
                    </label>
                    <input
                      type="text"
                      value={stage.title}
                      onChange={(e) =>
                        updateStage(index, "title", e.target.value)
                      }
                      placeholder="e.g., Foundation Construction"
                      className="w-full p-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-all"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-p-dark mb-2">
                      Planned Cost (NGN)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={stage.planned_cost}
                      onChange={(e) =>
                        updateStage(index, "planned_cost", e.target.value)
                      }
                      placeholder="0.00"
                      className="w-full p-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-p-dark mb-2">
                    Description
                  </label>
                  <textarea
                    value={stage.description}
                    onChange={(e) =>
                      updateStage(index, "description", e.target.value)
                    }
                    placeholder="Describe what will be accomplished in this stage"
                    rows={2}
                    className="w-full p-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent resize-none transition-all"
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-p-dark mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={stage.planned_start_date}
                      onChange={(e) =>
                        updateStage(index, "planned_start_date", e.target.value)
                      }
                      className="w-full p-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-all"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-p-dark mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={stage.planned_end_date}
                      onChange={(e) =>
                        updateStage(index, "planned_end_date", e.target.value)
                      }
                      className="w-full p-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addStage}
            className="w-full p-4 border-2 border-dashed border-theme-300 rounded-xl text-theme-600 hover:border-theme-500 hover:text-theme-700 hover:bg-theme-50 transition-all flex items-center justify-center gap-2 transform hover:scale-[1.01]"
            disabled={isLoading}
          >
            <Plus className="w-5 h-5" />
            Add Another Stage
          </button>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 border border-stone-200 rounded-xl text-p-dark hover:bg-stone-100 transition-colors font-medium"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-theme-600 text-white rounded-xl hover:bg-theme-700 transition-colors font-medium flex items-center justify-center gap-2 transform hover:scale-[1.01]"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Timeline Stages
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main component
export default function OutflowForm() {
  const [formData, setFormData] = useState<FormData>({
    type: "",
    chartId: "",
    projectId: "",
    timelineStageId: "",
    amount: "",
    description: "",
    paymentRef: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showTimelineCreation, setShowTimelineCreation] =
    useState<boolean>(false);
  const [showChartCreation, setShowChartCreation] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const currency = useSetting("default_currency");

  // Data states
  const [charts, setCharts] = useState<Chart[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timelineStages, setTimelineStages] = useState<TimelineStage[]>([]);

  // Loading states
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    projects: true,
    timelineStages: false,
    submitting: false,
    creatingTimeline: false,
    creatingChart: false,
  });

  // Error states
  const [errorStates, setErrorStates] = useState<ErrorStates>({
    projects: null,
    timelineStages: null,
  });

  // Fetch active projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingStates((prev) => ({ ...prev, projects: true }));
      setErrorStates((prev) => ({ ...prev, projects: null }));
      const params = new URLSearchParams({
        statuses: "active",
        paginate: "false",
        limit: "100",
        sortBy: "created_at",
        sortOrder: "desc",
      });

      try {
        const response = await fetch(`/api/projects?${params}`);
        if (!response.ok) {
          toast.error("Failed to fetch projects");
          throw new Error("Failed to fetch projects");
        }
        const data = await response.json();
        setProjects(data.data);
        console.log(data.data);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setErrorStates((prev) => ({
          ...prev,
          projects: "Failed to load projects. Please refresh and try again.",
        }));
      } finally {
        setLoadingStates((prev) => ({ ...prev, projects: false }));
      }
    };

    const fetchCharts = async () => {
      try {
        const { data, error } = await getCharts();
        if (error) {
          throw new Error(error);
        }
        setCharts(data || []);
        console.log(data);
      } catch (error) {
        console.error("Error fetching charts:", error);
        setErrorStates((prev) => ({
          ...prev,
          charts: "Failed to load charts. Please refresh and try again.",
        }));
      }
    };

    fetchCharts();
    fetchProjects();
  }, []);

  // Fetch timeline stages when project is selected
  useEffect(() => {
    const fetchTimelineStages = async () => {
      if (!formData.projectId) {
        setTimelineStages([]);
        return;
      }

      setLoadingStates((prev) => ({ ...prev, timelineStages: true }));
      setErrorStates((prev) => ({ ...prev, timelineStages: null }));

      try {
        const { error, data } = await getProjectTimelineById(
          formData.projectId
        );

        if (error) {
          throw new Error(`Failed to fetch timeline stages: ${error}`);
        }

        // Sort timeline stages properly
        const sortedStages = sortTimelineStages(data || []);
        setTimelineStages(sortedStages);
      } catch (error) {
        console.error("Error fetching timeline stages:", error);
        setErrorStates((prev) => ({
          ...prev,
          timelineStages: "Failed to load timeline stages.",
        }));
        setTimelineStages([]);
      } finally {
        setLoadingStates((prev) => ({ ...prev, timelineStages: false }));
      }
    };

    fetchTimelineStages();
  }, [formData.projectId]);

  const availableCharts = useMemo((): Chart[] => {
    return charts.filter((chart) => chart.chart_type === formData.type);
  }, [formData.type, charts]);

  const selectedChart = useMemo((): Chart | undefined => {
    return charts.find((chart) => chart.id === formData.chartId);
  }, [formData.chartId, charts]);

  const selectedProject = useMemo((): Project | undefined => {
    return projects.find((project) => project.id === formData.projectId);
  }, [formData.projectId, projects]);

  const selectedTimelineStage = useMemo((): TimelineStage | undefined => {
    return timelineStages.find(
      (stage) => stage.id === formData.timelineStageId
    );
  }, [formData.timelineStageId, timelineStages]);

  const handleInputChange = (field: keyof FormData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    if (field === "type") {
      setFormData((prev) => ({
        ...prev,
        chartId: "",
        projectId: "",
        timelineStageId: "",
      }));
    }
    if (field === "projectId") {
      setFormData((prev) => ({ ...prev, timelineStageId: "" }));
    }
  };

  const handleChartCreated = (newChart: Chart) => {
    setCharts((prev) => [...prev, newChart]);
    setFormData((prev) => ({ ...prev, chartId: newChart.id }));
  };

  const handleTimelineCreation = async (
    stages: CreateTimelineStageData[]
  ): Promise<void> => {
    if (!formData.projectId) return;

    setLoadingStates((prev) => ({ ...prev, creatingTimeline: true }));

    const validStages = stages.filter((stage) => stage.title.trim());
    try {
      if (validStages.length > 0 && selectedProject?.slug) {
        const timelineResponse = await fetch(
          `/api/projects/${selectedProject.slug}/timeline`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stages: validStages.map((stage) => ({
                title: stage.title,
                description: stage.description || null,
                planned_cost: parseFloat(stage.planned_cost) || 0,
                planned_start_date: stage.planned_start_date || null,
                planned_end_date: stage.planned_end_date || null,
                stage_order: stage.stage_order,
                media_urls: [],
              })),
            }),
          }
        );

        if (!timelineResponse.ok) {
          const timelineError = await timelineResponse.json();
          console.error("Timeline creation error:", timelineError);
          toast.error("Timeline creation failed: " + timelineError.error);
        } else {
          const data = await timelineResponse.json();
          toast.success("Timeline stages created successfully");
          // Refresh timeline stages for the current project with proper sorting
          const newStages = [...timelineStages, ...data.timeline];
          const sortedStages = sortTimelineStages(newStages);
          setTimelineStages(sortedStages);
          setShowTimelineCreation(false);
        }
      }
    } catch (error) {
      console.error("Error creating timeline:", error);
      toast.error("Error creating timeline. Please try again.");
    } finally {
      setLoadingStates((prev) => ({ ...prev, creatingTimeline: false }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.type) newErrors.type = "Please select a transaction type";
    if (!formData.chartId) {
      newErrors.chartId = "Please select a chart";
    } else {
      // Validate that chart type matches transaction type
      const chart = charts.find((c) => c.id === formData.chartId);
      if (chart && chart.chart_type !== formData.type) {
        newErrors.chartId = `Selected chart is for ${chart.chart_type} transactions, but you're recording a ${formData.type} transaction`;
      }
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0)
      newErrors.amount = "Please enter a valid amount";
    if (!formData.description.trim())
      newErrors.description = "Please provide a description";
    if (!formData.paymentRef.trim())
      newErrors.paymentRef = "Please provide a payment reference";
    if (formData.type === "deployment") {
      if (!formData.projectId)
        newErrors.projectId = "Please select a project for deployment";
      if (!formData.timelineStageId)
        newErrors.timelineStageId =
          "Please select a timeline stage for deployment";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) return;
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async (): Promise<void> => {
    setLoadingStates((prev) => ({ ...prev, submitting: true }));
    setShowConfirmation(false);

    try {
      // Create the transaction data matching your API schema
      const transactionData = {
        amount: parseFloat(formData.amount),
        paymentType: formData.type,
        projectId:
          formData.type === "deployment" ? formData.projectId : undefined,
        currency: currency,
        // Additional data for outflow transactions
        chartId: formData.chartId,
        description: formData.description,
        paymentRef: formData.paymentRef,
        timelineStageId:
          formData.type === "deployment" ? formData.timelineStageId : undefined,
      };

      const response = await fetch("/api/transactions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to record transaction: ${response.statusText}`
        );
      }

      const result = await response.json();

      // If this is a deployment transaction and a timeline stage was selected, mark it as in_progress
      if (
        formData.type === "deployment" &&
        formData.timelineStageId &&
        selectedProject?.slug
      ) {
        try {
          const stageUpdateResponse = await fetch(
            `/api/projects/${selectedProject.slug}/timeline/${formData.timelineStageId}/start`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transaction_amount: parseFloat(formData.amount),
                transaction_notes: formData.description,
                transaction_ref: formData.paymentRef,
              }),
            }
          );

          if (stageUpdateResponse.ok) {
            const stageResult = await stageUpdateResponse.json();
            // Update local state to reflect stage status change and reordering
            setTimelineStages((prev) => {
              // Remove the updated stage and re-insert it with new order
              const otherStages = prev.filter(
                (stage) => stage.id !== formData.timelineStageId
              );
              const updatedStage = {
                ...prev.find((stage) => stage.id === formData.timelineStageId)!,
                status: "in_progress" as const,
                stage_order: stageResult.stage.stage_order,
                actual_start_date: new Date().toISOString().split("T")[0],
              };

              // Sort stages properly using the utility function
              return sortTimelineStages([...otherStages, updatedStage]);
            });
            toast.success("Transaction recorded and timeline stage started!");
          } else {
            toast.success(
              "Transaction recorded successfully, but failed to update timeline stage status."
            );
          }
        } catch (stageError) {
          console.error("Error updating timeline stage:", stageError);
          toast.success(
            "Transaction recorded successfully, but failed to update timeline stage status."
          );
        }
      } else {
        toast.success("Transaction recorded successfully!");
      }

      // Reset form after successful submission
      setFormData({
        type: "",
        chartId: "",
        projectId: "",
        timelineStageId: "",
        amount: "",
        description: "",
        paymentRef: "",
      });
    } catch (error) {
      console.error("Error submitting transaction:", error);
      toast.error(
        `Error recording transaction: ${
          error instanceof Error ? error.message : "Please try again."
        }`
      );
    } finally {
      setLoadingStates((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-p-light via-theme-50 to-stone-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in-95 duration-500">
          {/* Header */}
          <div className="bg-gradient-to-r from-theme-500 via-theme-600 to-theme-700 px-8 py-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <span className="text-2xl w-8 h-8">₦</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Record Transaction</h1>
                  <p className="text-theme-100 text-lg">
                    Log expenses and deployments with transparency
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Transaction Type */}
            <div className="space-y-4">
              <label className="block text-lg font-bold text-p-dark">
                Transaction Type <span className="text-coral-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                {(["expense", "deployment"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleInputChange("type", type)}
                    className={`p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3 transform hover:scale-105 ${
                      formData.type === type
                        ? "border-theme-500 bg-theme-50 text-theme-700 shadow-lg scale-105"
                        : "border-stone-200 hover:border-theme-300 text-p-dark hover:bg-theme-25"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-xl ${
                        formData.type === type ? "bg-theme-100" : "bg-stone-100"
                      }`}
                    >
                      {type === "expense" ? (
                        <Receipt className="w-6 h-6" />
                      ) : (
                        <Rocket className="w-6 h-6" />
                      )}
                    </div>
                    <div className="text-center">
                      <span className="font-semibold text-lg capitalize">
                        {type}
                      </span>
                      <p className="text-sm opacity-75 mt-1">
                        {type === "expense"
                          ? "Record operational costs"
                          : "Fund project stages"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              {errors.type && (
                <p className="text-coral-500 text-sm animate-in fade-in slide-in-from-top duration-200">
                  {errors.type}
                </p>
              )}
            </div>

            {/* Chart Selection */}
            {formData.type && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-300">
                <div className="flex items-center justify-between">
                  <label className="text-lg font-bold text-p-dark">
                    Chart <span className="text-coral-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowChartCreation(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-theme-500 to-gold text-white rounded-lg hover:from-theme-600 hover:to-gold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <Plus className="w-4 h-4" />
                    Create Chart
                  </button>
                </div>

                {/* Chart Type Information */}
                <div
                  className={`p-4 rounded-xl border-l-4 ${
                    formData.type === "expense"
                      ? "bg-coral-50 border-coral-400"
                      : "bg-theme-50 border-theme-400"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {formData.type === "expense" ? (
                      <Receipt className="w-5 h-5 text-coral-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Rocket className="w-5 h-5 text-theme-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <h4 className="font-medium text-p-dark mb-1">
                        {formData.type === "expense"
                          ? "Expense Charts"
                          : "Deployment Charts"}
                      </h4>
                      <p className="text-sm text-p-dark opacity-75">
                        {formData.type === "expense"
                          ? "Use expense charts (EXP) for operational costs, utilities, supplies, and administrative expenses."
                          : "Use deployment charts (DEP) for project funding, infrastructure development, and community investments."}
                      </p>
                    </div>
                  </div>
                </div>

                {availableCharts.length > 0 ? (
                  <>
                    <div className="relative">
                      <select
                        value={formData.chartId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handleInputChange("chartId", e.target.value)
                        }
                        className="w-full p-4 border-2 border-stone-200 rounded-xl focus:border-theme-500 focus:outline-none appearance-none bg-white text-p-dark shadow-sm transition-all focus:ring-2 focus:ring-theme-200"
                      >
                        <option value="">
                          Select a {formData.type} chart...
                        </option>
                        {availableCharts.map((chart) => (
                          <option key={chart.id} value={chart.id}>
                            [{chart.chart_type.toUpperCase()}]{" "}
                            {chart.public_name} ({chart.code})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-200 pointer-events-none" />
                    </div>
                    {selectedChart && (
                      <div className="bg-theme-50 p-4 rounded-xl border border-theme-200 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                selectedChart.chart_type === "expense"
                                  ? "bg-coral-100 text-coral-700"
                                  : "bg-theme-100 text-theme-700"
                              }`}
                            >
                              {selectedChart.chart_type.toUpperCase()}
                            </span>
                            <span className="font-medium text-theme-800">
                              {selectedChart.public_name}
                            </span>
                          </div>
                          <span className="text-xs text-theme-600 font-mono">
                            {selectedChart.code}
                          </span>
                        </div>
                        <p className="text-sm text-theme-700">
                          {selectedChart.description}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-gold/10 p-6 rounded-xl border border-gold/30 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="w-5 h-5 text-gold" />
                      <p className="font-medium text-p-dark">
                        No {formData.type} Charts Available
                      </p>
                    </div>
                    <p className="text-sm text-p-dark mb-4">
                      No charts found for{" "}
                      <span className="font-medium uppercase">
                        {formData.type}
                      </span>{" "}
                      transactions. Create one to continue.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowChartCreation(true)}
                      className="w-full p-3 bg-gold text-white rounded-lg hover:bg-gold/90 transition-colors font-medium transform hover:scale-[1.01] flex items-center justify-center gap-2"
                    >
                      {formData.type === "expense" ? (
                        <Receipt className="w-4 h-4" />
                      ) : (
                        <Rocket className="w-4 h-4" />
                      )}
                      Create {formData.type} Chart
                    </button>
                  </div>
                )}

                {errors.chartId && (
                  <p className="text-coral-500 text-sm animate-in fade-in duration-200">
                    {errors.chartId}
                  </p>
                )}
              </div>
            )}

            {/* Project Selection (for deployments) */}
            {formData.type === "deployment" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-300">
                <label className="text-lg font-bold text-p-dark">
                  Project <span className="text-coral-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.projectId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      handleInputChange("projectId", e.target.value)
                    }
                    className="w-full p-4 border-2 border-stone-200 rounded-xl focus:border-theme-500 focus:outline-none appearance-none bg-white text-p-dark shadow-sm transition-all focus:ring-2 focus:ring-theme-200"
                    disabled={loadingStates.projects}
                  >
                    <option value="">
                      {loadingStates.projects
                        ? "Loading projects..."
                        : "Select a project..."}
                    </option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                  {loadingStates.projects ? (
                    <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-200 animate-spin" />
                  ) : (
                    <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-200 pointer-events-none" />
                  )}
                </div>

                {selectedProject && (
                  <div className="bg-lime/10 p-4 rounded-xl border border-lime/30 animate-in fade-in duration-200">
                    <p className="text-sm text-p-dark">
                      {selectedProject.description}
                    </p>
                  </div>
                )}
                {errors.projectId && (
                  <p className="text-coral-500 text-sm animate-in fade-in duration-200">
                    {errors.projectId}
                  </p>
                )}
              </div>
            )}

            {/* Timeline Stage Selection (for deployments) */}
            {formData.type === "deployment" && formData.projectId && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-300">
                <label className="text-lg font-bold text-p-dark">
                  Timeline Stage <span className="text-coral-500">*</span>
                </label>

                {loadingStates.timelineStages ? (
                  <div className="flex items-center justify-center p-8 bg-stone-100 rounded-xl border-2 border-dashed border-stone-200">
                    <Loader2 className="w-6 h-6 animate-spin text-theme-500 mr-2" />
                    <span className="text-p-dark">
                      Loading timeline stages...
                    </span>
                  </div>
                ) : timelineStages.length > 0 ? (
                  <>
                    <div className="relative">
                      <select
                        value={formData.timelineStageId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handleInputChange("timelineStageId", e.target.value)
                        }
                        className="w-full p-4 border-2 border-stone-200 rounded-xl focus:border-theme-500 focus:outline-none appearance-none bg-white text-p-dark shadow-sm transition-all focus:ring-2 focus:ring-theme-200"
                      >
                        <option value="">Select a timeline stage...</option>
                        {timelineStages.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.title} (₦
                            {stage.planned_cost.toLocaleString()}) -{" "}
                            {stage.status}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-200 pointer-events-none" />
                    </div>

                    {selectedTimelineStage && (
                      <div className="bg-theme-50 p-4 rounded-xl border border-theme-200 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-theme-800">
                            {selectedTimelineStage.title}
                          </h4>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              selectedTimelineStage.status === "pending"
                                ? "bg-gold/20 text-p-dark"
                                : selectedTimelineStage.status === "in_progress"
                                ? "bg-theme-100 text-theme-800"
                                : "bg-lime/20 text-p-dark"
                            }`}
                          >
                            {selectedTimelineStage.status.replace("_", " ")}
                          </span>
                        </div>
                        {selectedTimelineStage.description && (
                          <p className="text-sm text-theme-700 mb-2">
                            {selectedTimelineStage.description}
                          </p>
                        )}
                        <div className="text-xs text-theme-600">
                          <span className="font-medium">Planned Cost:</span> ₦
                          {selectedTimelineStage.planned_cost.toLocaleString()}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowTimelineCreation(true)}
                      className="w-full p-3 border-2 border-dashed border-theme-300 rounded-xl text-theme-600 hover:border-theme-500 hover:text-theme-700 hover:bg-theme-50 transition-all flex items-center justify-center gap-2 transform hover:scale-[1.01]"
                    >
                      <Plus className="w-4 h-4" />
                      Add More Timeline Stages
                    </button>
                  </>
                ) : (
                  <div className="bg-gold/10 p-6 rounded-xl border border-gold/30 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="w-5 h-5 text-gold" />
                      <p className="font-medium text-p-dark">
                        No Valid Timeline Found
                      </p>
                    </div>
                    <p className="text-sm text-p-dark mb-4">
                      This project doesn't have any valid timeline stages available for deployment yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowTimelineCreation(true)}
                      className="w-full p-3 bg-gold text-white rounded-lg hover:bg-gold/90 transition-colors font-medium transform hover:scale-[1.01]"
                    >
                      Create Timeline for this Project
                    </button>
                  </div>
                )}

                {errors.timelineStageId && (
                  <p className="text-coral-500 text-sm animate-in fade-in duration-200">
                    {errors.timelineStageId}
                  </p>
                )}
              </div>
            )}

            {/* Timeline Creation Form */}
            <TimelineCreationForm
              show={showTimelineCreation}
              onCancel={() => setShowTimelineCreation(false)}
              onSave={handleTimelineCreation}
              isLoading={loadingStates.creatingTimeline}
              existingStages={timelineStages}
            />

            {/* Amount & Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-lg font-bold text-p-dark">
                  Amount ({currency}) <span className="text-coral-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl text-stone-200">
                    ₦
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange("amount", e.target.value)
                    }
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-4 border-2 border-stone-200 rounded-xl focus:border-theme-500 focus:outline-none text-p-dark shadow-sm transition-all focus:ring-2 focus:ring-theme-200"
                  />
                </div>
                {errors.amount && (
                  <p className="text-coral-500 text-sm animate-in fade-in duration-200">
                    {errors.amount}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-lg font-bold text-p-dark">
                  Payment Reference <span className="text-coral-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.paymentRef}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("paymentRef", e.target.value)
                  }
                  placeholder="e.g., TXN-2025-001"
                  className="w-full p-4 border-2 border-stone-200 rounded-xl focus:border-theme-500 focus:outline-none text-p-dark shadow-sm transition-all focus:ring-2 focus:ring-theme-200"
                />
                {errors.paymentRef && (
                  <p className="text-coral-500 text-sm animate-in fade-in duration-200">
                    {errors.paymentRef}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <label className="text-lg font-bold text-p-dark">
                Description <span className="text-coral-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Provide detailed information about this transaction..."
                rows={4}
                className="w-full p-4 border-2 border-stone-200 rounded-xl focus:border-theme-500 focus:outline-none resize-none text-p-dark shadow-sm transition-all focus:ring-2 focus:ring-theme-200"
              />
              {errors.description && (
                <p className="text-coral-500 text-sm animate-in fade-in duration-200">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loadingStates.submitting || loadingStates.projects}
              className="w-full bg-gradient-to-r from-theme-600 to-theme-700 text-white py-5 px-6 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 hover:from-theme-700 hover:to-theme-800 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loadingStates.submitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Recording Transaction...
                </>
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  Record Transaction
                </>
              )}
            </button>
          </div>
        </div>

        {/* Chart Creation Dialog */}
        <CreateChartDialog
          open={showChartCreation}
          onOpenChange={setShowChartCreation}
          transactionType={formData.type as "expense" | "deployment"}
          onChartCreated={handleChartCreated}
        />

        {/* Transaction Confirmation Dialog */}
        <TransactionConfirmationDialog
          open={showConfirmation}
          onOpenChange={setShowConfirmation}
          onConfirm={handleConfirmSubmit}
          loading={loadingStates.submitting}
          details={{
            type: formData.type as "expense" | "deployment",
            amount: formData.amount,
            description: formData.description,
            paymentRef: formData.paymentRef,
            chartName: selectedChart?.public_name,
            projectName: selectedProject?.title,
            timelineStageName: selectedTimelineStage?.title,
            currency: currency,
          }}
        />
      </div>
    </div>
  );
}
