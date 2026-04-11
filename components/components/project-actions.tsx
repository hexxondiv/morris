// components/ProjectActions.tsx
"use client";

import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Trash2 } from "lucide-react";
import { updateProject, deleteProject } from "@/lib/actions/projects";
import { useState } from "react";

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  budget: number;
  progress: number;
  ownerId: string;
}

interface ProjectActionsProps {
  project: Project;
}

export function ProjectActions({ project }: ProjectActionsProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      name: project.name,
      status: project.status,
      budget: project.budget,
      progress: project.progress,
    },
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const onUpdateProject = async (data: {
    name: string;
    status: string;
    budget: number;
    progress: number;
  }) => {
    const result = await updateProject(project.id, {
      name: data.name,
      status: data.status,
      budget: Number(data.budget),
      progress: Number(data.progress),
    });
    if (result.success) {
      toast.success("Project updated successfully");
      reset({
        name: data.name,
        status: data.status,
        budget: data.budget,
        progress: data.progress,
      });
      setIsEditDialogOpen(false);
    } else {
      toast.error(result.error || "Failed to update project");
    }
  };

  const onDeleteProject = async () => {
    const result = await deleteProject(project.id);
    if (result.success) {
      toast.success("Project deleted successfully");
      setIsDeleteDialogOpen(false);
    } else {
      toast.error(result.error || "Failed to delete project");
    }
  };

  return (
    <div className="flex space-x-2">
      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" title="Edit Project">
            <Edit className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Project: {project.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onUpdateProject)} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <Input
                {...register("name", { required: "Name is required" })}
                className="mt-1"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <Select
                disabled={isSubmitting}
                defaultValue={project.status}
                onValueChange={(value) =>
                  setValue("status", value, { shouldValidate: true })
                }
                {...register("status", { required: "Status is required" })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Status</SelectLabel>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.status.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Budget
              </label>
              <Input
                type="number"
                {...register("budget", {
                  required: "Budget is required",
                  min: 0,
                })}
                className="mt-1"
                disabled={isSubmitting}
              />
              {errors.budget && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.budget.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress (%)
              </label>
              <Input
                type="number"
                {...register("progress", {
                  required: "Progress is required",
                  min: 0,
                  max: 100,
                })}
                className="mt-1"
                disabled={isSubmitting}
              />
              {errors.progress && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.progress.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-primary text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Update Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" title="Delete Project">
            <Trash2 className="h-4 w-4 text-coral " />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete {project.name}? This action cannot
            be undone.
          </p>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={onDeleteProject}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
