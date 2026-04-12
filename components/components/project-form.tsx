// components/forms/project-form.tsx
/**
 * Project create/update uses `/api/projects` (POST) and `/api/projects/[slug]` (PUT) with
 * Prisma-backed handlers. Cover images use `/api/upload-image` and first-party storage.
 */
"use client";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import {
  ProjectFormSchema,
  projectFormSchema,
  projectSchema,
  ProjectSchema,
} from "@/lib/zod-schema";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { SimpleEditor } from "../tiptap-templates/simple/simple-editor";
import slugify from "slugify";
import {
  Loader2Icon,
  ChevronDown,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { cn, isAuthorized } from "@/lib/utils";
import { toast } from "sonner";
import { DateTimePicker } from "./date-picker";
import { useUserRole } from "@/hooks/use-role";

// Define props for CoverImageUploader
interface CoverImageUploaderProps {
  handleCoverImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingCoverImage: boolean;
  coverPreviewUrl: string | null;
  watch: UseFormReturn<ProjectSchema>["watch"];
}

// Define props for ProjectForm
interface ProjectFormProps {
  project?: ProjectSchema & {
    id?: string;
    timeline?: Array<{
      id: string;
      title: string;
      description: string | null;
      planned_cost: number;
      stage_order: number;
      planned_start_date: string | null;
      planned_end_date: string | null;
      status: string;
    }>;
    votingPeriod?: {
      id: string;
      start_date: string;
      end_date: string;
    };
  };
  onClose?: () => void;
}

// Timeline Stage Interface
interface TimelineStageForm {
  title: string;
  description: string;
  planned_cost: string;
  planned_start_date: string;
  planned_end_date: string;
}

// CoverImageUploader Component
function CoverImageUploader({
  handleCoverImageChange,
  isUploadingCoverImage,
  coverPreviewUrl,
  watch,
}: CoverImageUploaderProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleCoverImageChange({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  };

  return (
    <div className="space-y-3">
      <Label
        htmlFor="cover_image"
        className="text-sm font-medium text-theme-700 dark:text-theme-200"
      >
        Cover Image
      </Label>
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex-1">
          <div
            className={cn(
              "relative rounded-lg border-2 border-dashed p-6 transition-all duration-300",
              isDragging
                ? "border-theme-500 bg-theme-50"
                : "border-theme-300 dark:border-theme-600",
              isUploadingCoverImage && "opacity-50 cursor-not-allowed"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Input
              id="cover_image"
              type="file"
              accept="image/*"
              onChange={handleCoverImageChange}
              disabled={isUploadingCoverImage}
              className="h-12 w-full cursor-pointer rounded-md border-none bg-transparent text-sm text-theme-600 dark:text-theme-300 file:mr-4 file:cursor-pointer file:rounded-md file:bg-theme-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-theme-600 focus:outline-none"
            />
            {isUploadingCoverImage && (
              <div className="mt-3 flex items-center gap-2 text-sm text-theme-500 dark:text-theme-400">
                <Loader2Icon className="h-4 w-4 animate-spin text-theme-500" />
                Uploading...
              </div>
            )}
            <p className="mt-2 text-xs text-theme-500 dark:text-theme-400">
              Drag and drop an image here or click to browse
            </p>
          </div>
        </div>
        <div className="relative h-48 w-full rounded-xl border border-theme-200 bg-theme-50 dark:border-theme-700 dark:bg-theme-800 md:w-48">
          {coverPreviewUrl || watch("cover_image") ? (
            <img
              src={coverPreviewUrl || watch("cover_image")}
              alt="Cover Preview"
              className="h-full w-full rounded-xl object-cover transition-opacity duration-300 hover:opacity-90"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2">
              <span className="text-xs text-theme-500 dark:text-theme-400">
                No image selected
              </span>
              <span className="text-xs text-theme-400 dark:text-theme-500">
                16:9 recommended
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Timeline Setup Component
function TimelineSetup({
  show,
  stages,
  setStages,
}: {
  show: boolean;
  stages: TimelineStageForm[];
  setStages: React.Dispatch<React.SetStateAction<TimelineStageForm[]>>;
}) {
  const addStage = () => {
    setStages([
      ...stages,
      {
        title: "",
        description: "",
        planned_cost: "",
        planned_start_date: "",
        planned_end_date: "",
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

  if (!show) return null;

  return (
    <Card className="border-theme-300 bg-theme-50/30 shadow-sm">
      <CardHeader className="border-b border-theme-200">
        <CardTitle className="flex items-center gap-2 text-theme-900">
          <AlertTriangle className="w-5 h-5 text-theme-600" />
          Timeline Setup Required
        </CardTitle>
        <Alert className="bg-theme-50 border-theme-300">
          <AlertDescription className="text-theme-800">
            Since you're setting this project to "Active", you need to define
            the implementation timeline. These stages will be completed
            sequentially and track the project's progress.
          </AlertDescription>
        </Alert>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {stages.map((stage, index) => (
          <Card key={index} className="border-theme-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-theme-100">
              <CardTitle className="text-base text-theme-900">
                Stage {index + 1}
              </CardTitle>
              {stages.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStage(index)}
                  className="text-theme-600 hover:text-theme-800 hover:bg-theme-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <Label
                  htmlFor={`stage-title-${index}`}
                  className="text-theme-700"
                >
                  Stage Title *
                </Label>
                <Input
                  id={`stage-title-${index}`}
                  value={stage.title}
                  onChange={(e) => updateStage(index, "title", e.target.value)}
                  placeholder="e.g., Foundation Construction"
                  required
                  className="border-theme-300 focus:border-theme-500 focus:ring-theme-500/20"
                />
              </div>
              <div>
                <Label
                  htmlFor={`stage-description-${index}`}
                  className="text-theme-700"
                >
                  Description
                </Label>
                <Textarea
                  id={`stage-description-${index}`}
                  value={stage.description}
                  onChange={(e) =>
                    updateStage(index, "description", e.target.value)
                  }
                  placeholder="Describe what will be done in this stage"
                  rows={3}
                  className="border-theme-300 focus:border-theme-500 focus:ring-theme-500/20"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label
                    htmlFor={`stage-cost-${index}`}
                    className="text-theme-700"
                  >
                    Planned Cost
                  </Label>
                  <Input
                    id={`stage-cost-${index}`}
                    type="number"
                    step="0.01"
                    value={stage.planned_cost}
                    onChange={(e) =>
                      updateStage(index, "planned_cost", e.target.value)
                    }
                    placeholder="0.00"
                    className="border-theme-300 focus:border-theme-500 focus:ring-theme-500/20"
                  />
                </div>
                <div>
                  <Label
                    htmlFor={`stage-start-${index}`}
                    className="text-theme-700"
                  >
                    Start Date
                  </Label>
                  <Input
                    id={`stage-start-${index}`}
                    type="date"
                    value={stage.planned_start_date}
                    onChange={(e) =>
                      updateStage(index, "planned_start_date", e.target.value)
                    }
                    className="border-theme-300 focus:border-theme-500 focus:ring-theme-500/20"
                  />
                </div>
                <div>
                  <Label
                    htmlFor={`stage-end-${index}`}
                    className="text-theme-700"
                  >
                    End Date
                  </Label>
                  <Input
                    id={`stage-end-${index}`}
                    type="date"
                    value={stage.planned_end_date}
                    onChange={(e) =>
                      updateStage(index, "planned_end_date", e.target.value)
                    }
                    className="border-theme-300 focus:border-theme-500 focus:ring-theme-500/20"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addStage}
          className="w-full border-theme-500 text-theme-700 hover:bg-theme-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Stage
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ProjectForm({ project, onClose }: ProjectFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [bodyHtml, setBodyHtml] = useState<string>(project?.body_html || "");
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(
    project?.cover_image || null
  );
  const [isUploadingCoverImage, setIsUploadingCoverImage] =
    useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const userRole = useUserRole();
  const [votingPeriod, setVotingPeriod] = useState<{
    start_date?: string;
    end_date?: string;
  } | null>(null);

  // Timeline stages state - populate with existing data if available
  const [timelineStages, setTimelineStages] = useState<TimelineStageForm[]>(
    () => {
      if (project?.timeline && project.timeline.length > 0) {
        return project.timeline.map((stage) => ({
          title: stage.title,
          description: stage.description || "",
          planned_cost: stage.planned_cost.toString(),
          planned_start_date: stage.planned_start_date
            ? stage.planned_start_date.split("T")[0]
            : "",
          planned_end_date: stage.planned_end_date
            ? stage.planned_end_date.split("T")[0]
            : "",
        }));
      }
      return [
        {
          title: "",
          description: "",
          planned_cost: "",
          planned_start_date: "",
          planned_end_date: "",
        },
      ];
    }
  );

  const {
    watch,
    setValue,
    control,
    formState: { isSubmitting, errors },
    register,
    handleSubmit,
  } = useForm<ProjectFormSchema>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: project?.title || "",
      description: project?.description || "",
      goal_amount: project?.goal_amount || 0,
      status: project?.status || "draft",
      state: project ? (project.state ?? "") : "delta",
      country: project?.country || null,
      sector: project?.sector || null,
      cover_image: project?.cover_image || undefined,
      body_html: project?.body_html || undefined,
      start_date: project?.start_date || undefined,
      end_date: project?.end_date || undefined,
    },
  });

  const status = watch("status");
  const previousStatus = project?.status;
  const isTransitioningToActive =
    status === "active" && previousStatus !== "active";

  useEffect(() => {
    if (!userId) return;

    const requiredRole = "editor";
    setIsAdmin(isAuthorized(userRole, requiredRole));

    if (project?.votingPeriod) {
      setVotingPeriod(project.votingPeriod);
      setValue("start_date", project.votingPeriod.start_date);
      setValue("end_date", project.votingPeriod.end_date);
    }
  }, [userId, userRole, project?.votingPeriod, setValue]);

  const handleCoverImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCoverImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", "project-covers");

      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const result: { url?: string; error?: string } = await res.json();

      if (res.ok && result.url) {
        setCoverPreviewUrl(result.url);
        setValue("cover_image", result.url);
        toast.success("Image uploaded successfully");
      } else {
        throw new Error(result.error || "Failed to upload image");
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Error uploading image");
    } finally {
      setIsUploadingCoverImage(false);
    }
  };

  const onSubmit = async (data: ProjectSchema) => {
    try {
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Validate timeline stages if transitioning to active
      if (isTransitioningToActive) {
        const validStages = timelineStages.filter((stage) =>
          stage.title.trim()
        );
        if (validStages.length === 0) {
          throw new Error(
            "At least one timeline stage is required when activating a project"
          );
        }
      }

      // Ensure slug is generated if title is provided
      const generatedSlug = data.title
        ? slugify(data.title.toLowerCase(), { lower: true, strict: true })
        : project?.slug || null;

      const projectData = {
        ...data,
        id: project?.id,
        creator_id: userId,
        current_amount: project?.current_amount || 0,
        cover_image: data.cover_image || null,
        body_html: bodyHtml || null,
        slug: generatedSlug,
        start_date: data.start_date,
        end_date: data.end_date,
      };

      const editSlug = project?.slug;
      const isEdit = Boolean(project?.id && editSlug);
      const saveUrl = isEdit && editSlug
        ? `/api/projects/${encodeURIComponent(editSlug)}`
        : "/api/projects";
      const saveMethod = isEdit ? "PUT" : "POST";

      const saveRes = await fetch(saveUrl, {
        method: saveMethod,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(projectData),
      });

      const saveJson = (await saveRes.json().catch(() => ({}))) as {
        error?: string;
        project?: { id: string; slug: string };
      };

      if (!saveRes.ok) {
        throw new Error(
          typeof saveJson.error === "string"
            ? saveJson.error
            : "Failed to save project"
        );
      }

      const updatedProject = saveJson.project;
      if (!updatedProject?.slug) {
        throw new Error("Project slug is missing");
      }

      // Handle timeline creation if transitioning to active
      if (isTransitioningToActive && updatedProject.slug) {
        const validStages = timelineStages.filter((stage) =>
          stage.title.trim()
        );

        if (validStages.length > 0) {
          const timelineResponse = await fetch(
            `/api/projects/${updatedProject.slug}/timeline`,
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
                  media_urls: [],
                })),
              }),
            }
          );

          if (!timelineResponse.ok) {
            const timelineError = await timelineResponse.json();
            console.error("Timeline creation error:", timelineError);
            // Don't fail the entire operation, just warn
            toast.error(
              "Project saved but timeline creation failed: " +
                timelineError.error
            );
          } else {
            toast.success(
              "Project activated and timeline created successfully"
            );
          }
        }
      }

      // Handle timeline updates if project already has timeline and is being edited
      if (
        project?.timeline &&
        project.timeline.length > 0 &&
        !isTransitioningToActive
      ) {
        const validStages = timelineStages.filter((stage) =>
          stage.title.trim()
        );

        // Only update timeline if there are pending stages that can be modified
        const pendingStages = project.timeline.filter(
          (stage) => stage.status === "pending"
        );
        if (pendingStages.length > 0 && validStages.length > 0) {
          try {
            const timelineResponse = await fetch(
              `/api/projects/${updatedProject.slug}/timeline`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  stages: validStages.map((stage, index) => ({
                    title: stage.title,
                    description: stage.description || null,
                    planned_cost: parseFloat(stage.planned_cost) || 0,
                    planned_start_date: stage.planned_start_date || null,
                    planned_end_date: stage.planned_end_date || null,
                    stage_order: index + 1,
                    media_urls: [],
                  })),
                }),
              }
            );

            if (!timelineResponse.ok) {
              const timelineError = await timelineResponse.json();
              console.error("Timeline update error:", timelineError);
              toast.error(
                "Project saved but timeline update failed: " +
                  timelineError.error
              );
            }
          } catch (timelineError) {
            console.error("Timeline update error:", timelineError);
            toast.error("Project saved but timeline update failed");
          }
        }
      }

      if (!isTransitioningToActive) {
        toast.success(
          project?.id
            ? "Project updated successfully"
            : "Project created successfully"
        );
      }

      // Redirect to the project page using the slug
      if (updatedProject?.slug) {
        router.push(`/projects/${updatedProject.slug}`);
      } else {
        throw new Error("Project slug is missing");
      }

      if (onClose) onClose();
      router.refresh();
    } catch (error: any) {
      console.error("Error saving project:", error);
      toast.error(error.message || "Error saving project");
    }
  };

  const handleCancel = () => {
    router.push("/admin/projects");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-50 to-theme-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 w-full">
          {/* Header */}
          <div className="text-center py-6">
            <h3 className="text-2xl sm:text-3xl font-bold text-theme-900 dark:text-theme-100">
              {project?.id ? "Edit" : "Create"} Project
            </h3>
            <p className="text-theme-600 mt-2">
              {project?.id
                ? "Update your project details"
                : "Create a new crowdfunding project"}
            </p>
          </div>

          {/* Main Form Card */}
          <Card className="border-theme-200 shadow-lg">
            <CardContent className="p-8 space-y-8">
              {/* Basic Project Information */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="title"
                    className="text-sm font-medium text-theme-700 dark:text-theme-200"
                  >
                    Project Title
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter project title"
                    {...register("title")}
                    className="h-12 rounded-md border-theme-300 px-3 py-2 text-sm focus:border-theme-500 focus:ring-theme-500/20 dark:border-theme-600 dark:bg-theme-800 dark:text-theme-200"
                  />
                  {errors.title && (
                    <p className="text-red-600 text-sm">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="text-sm font-medium text-theme-700 dark:text-theme-200"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your project"
                    {...register("description")}
                    className="min-h-[100px] rounded-md border-theme-300 px-3 py-2 text-sm focus:border-theme-500 focus:ring-theme-500/20 dark:border-theme-600 dark:bg-theme-800 dark:text-theme-200"
                  />
                  {errors.description && (
                    <p className="text-red-600 text-sm">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                {/* Location and Sector */}
                <div className="flex flex-col gap-6 md:flex-row">
                  <div className="flex-1 space-y-2">
                    <Label
                      htmlFor="state"
                      className="text-sm font-medium text-theme-700 dark:text-theme-200"
                    >
                      State
                    </Label>
                    <div className="relative">
                      <select
                        id="state"
                        {...register("state")}
                        className={cn(
                          "h-12 w-full appearance-none rounded-md border border-theme-300 bg-white px-3 py-2 text-sm text-theme-900 transition-all duration-200 focus:border-theme-500 focus:outline-none focus:ring-2 focus:ring-theme-500/20 dark:border-theme-600 dark:bg-theme-800 dark:text-theme-200",
                          errors.state && "border-red-500 focus:ring-red-500/20"
                        )}
                      >
                        <option value="" disabled>
                          Select State
                        </option>
                        <option value="abia">Abia</option>
                        <option value="anambra">Anambra</option>
                        <option value="delta">Delta State</option>
                        <option value="ebonyi">Ebonyi</option>
                        <option value="enugu">Enugu</option>
                        <option value="imo">Imo</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-400 dark:text-theme-500" />
                    </div>
                    {errors.state && (
                      <p className="text-red-600 text-sm">
                        {errors.state.message}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label
                      htmlFor="country"
                      className="text-sm font-medium text-theme-700 dark:text-theme-200"
                    >
                      Country
                    </Label>
                    <div className="relative">
                      <select
                        id="country"
                        {...register("country")}
                        className={cn(
                          "h-12 w-full appearance-none rounded-md border border-theme-300 bg-white px-3 py-2 text-sm text-theme-900 transition-all duration-200 focus:border-theme-500 focus:outline-none focus:ring-2 focus:ring-theme-500/20 dark:border-theme-600 dark:bg-theme-800 dark:text-theme-200",
                          errors.country &&
                            "border-red-500 focus:ring-red-500/20"
                        )}
                      >
                        <option value="nigeria">Nigeria</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-400 dark:text-theme-500" />
                    </div>
                    {errors.country && (
                      <p className="text-red-600 text-sm">
                        {errors.country.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sector and Goal Amount */}
                <div className="flex flex-col gap-6 md:flex-row">
                  <div className="flex-1 space-y-2">
                    <Label
                      htmlFor="sector"
                      className="text-sm font-medium text-theme-700 dark:text-theme-200"
                    >
                      Sector
                    </Label>
                    <div className="relative">
                      <select
                        id="sector"
                        {...register("sector")}
                        className={cn(
                          "h-12 w-full appearance-none rounded-md border border-theme-300 bg-white px-3 py-2 text-sm text-theme-900 transition-all duration-200 focus:border-theme-500 focus:outline-none focus:ring-2 focus:ring-theme-500/20 dark:border-theme-600 dark:bg-theme-800 dark:text-theme-200",
                          errors.sector &&
                            "border-red-500 focus:ring-red-500/20"
                        )}
                      >
                        <option value="education">Education</option>
                        <option value="politics">Politics</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-400 dark:text-theme-500" />
                    </div>
                    {errors.sector && (
                      <p className="text-red-600 text-sm">
                        {errors.sector.message}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label
                      htmlFor="goal_amount"
                      className="text-sm font-medium text-theme-700 dark:text-theme-200"
                    >
                      Goal Amount
                    </Label>
                    <Input
                      id="goal_amount"
                      type="number"
                      step="5000.00"
                      placeholder="Enter goal amount"
                      {...register("goal_amount", { valueAsNumber: true })}
                      className={cn(
                        "h-12 rounded-md border border-theme-300 px-3 py-2 text-sm focus:border-theme-500 focus:ring-theme-500/20 dark:border-theme-600 dark:bg-theme-800 dark:text-theme-200",
                        errors.goal_amount &&
                          "border-red-500 focus:ring-red-500/20"
                      )}
                    />
                    {errors.goal_amount && (
                      <p className="text-red-600 text-sm">
                        {errors.goal_amount.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label
                    htmlFor="status"
                    className="text-sm font-medium text-theme-700 dark:text-theme-200"
                  >
                    Status
                  </Label>
                  <div className="relative">
                    <select
                      id="status"
                      {...register("status")}
                      className={cn(
                        "h-12 w-full appearance-none rounded-md border border-theme-300 bg-white px-3 py-2 text-sm text-theme-900 transition-all duration-200 focus:border-theme-500 focus:outline-none focus:ring-2 focus:ring-theme-500/20 dark:border-theme-600 dark:bg-theme-800 dark:text-theme-200",
                        errors.status && "border-red-500 focus:ring-red-500/20"
                      )}
                    >
                      <option value="draft">Draft</option>
                      <option value="proposed">Proposed</option>
                      <option value="voting">Voting</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-400 dark:text-theme-500" />
                  </div>
                  {errors.status && (
                    <p className="text-red-600 text-sm">
                      {errors.status.message}
                    </p>
                  )}
                </div>

                {/* Voting Period (if status is voting) */}
                {status === "voting" && (
                  <Card className="border-theme-300 bg-theme-50/30 shadow-sm">
                    <CardHeader className="border-b border-theme-200">
                      <CardTitle className="flex items-center gap-2 text-theme-900">
                        <AlertTriangle className="w-5 h-5 text-theme-600" />
                        Voting Period Required
                      </CardTitle>
                      <Alert className="bg-theme-50 border-theme-300">
                        <AlertDescription className="text-theme-800">
                          Since you're setting this project to "Voting", you
                          need to define the voting periods.
                        </AlertDescription>
                      </Alert>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                      <div className="flex flex-col gap-6 md:flex-row">
                        <DateTimePicker
                          control={control}
                          name="start_date"
                          label="Voting Start Date"
                          description="Select the start date and time for voting."
                        />
                        <DateTimePicker
                          control={control}
                          name="end_date"
                          label="Voting End Date"
                          description="Select the end date and time for voting."
                        />
                      </div>
                      {(errors.start_date || errors.end_date) && (
                        <Alert variant="destructive">
                          <AlertDescription>
                            {errors.start_date?.message ||
                              errors.end_date?.message}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Timeline Setup (if transitioning to active) */}
                <TimelineSetup
                  show={isTransitioningToActive}
                  stages={timelineStages}
                  setStages={setTimelineStages}
                />

                {/* Cover Image */}
                <CoverImageUploader
                  handleCoverImageChange={handleCoverImageChange}
                  isUploadingCoverImage={isUploadingCoverImage}
                  coverPreviewUrl={coverPreviewUrl}
                  watch={watch}
                />

                {/* Body Content */}
                <div className="space-y-2">
                  <Label
                    htmlFor="body"
                    className="text-sm font-medium text-theme-700 dark:text-theme-200"
                  >
                    Project Details
                  </Label>
                  <div className="border border-theme-300 rounded-md focus-within:border-theme-500 focus-within:ring-2 focus-within:ring-theme-500/20">
                    <SimpleEditor value={bodyHtml} onChange={setBodyHtml} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display all errors at once */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 p-4 rounded">
              <h3>Please fix the following errors:</h3>
              <ul>
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field} className="text-red-600">
                    {field} {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Form Actions */}
          <Card className="border-theme-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="submit"
                  className="h-12 w-full rounded-md bg-theme-500 px-4 py-2 text-sm font-medium text-white hover:bg-theme-600 focus:outline-none focus:ring-2 focus:ring-theme-500/20 disabled:opacity-50 transition-all duration-200"
                  disabled={isSubmitting || !isAdmin}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                      {isTransitioningToActive
                        ? "Activating Project..."
                        : "Submitting..."}
                    </span>
                  ) : project?.id ? (
                    isTransitioningToActive ? (
                      "Activate Project & Create Timeline"
                    ) : (
                      "Update Project"
                    )
                  ) : (
                    "Create Project"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-md border-theme-300 px-4 py-2 text-sm font-medium text-theme-700 hover:bg-theme-50 focus:outline-none focus:ring-2 focus:ring-theme-500/20 dark:border-theme-600 dark:text-theme-200 dark:hover:bg-theme-800 transition-all duration-200"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
