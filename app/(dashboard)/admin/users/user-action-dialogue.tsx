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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, User } from "lucide-react";
import { useState } from "react";
import {
  deactivateUser,
  updateUserRole,
  updateUserDetails,
} from "@/lib/actions/users";

interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  firstName: string;
  lastName: string;
}

interface UserActionsProps {
  user: User;
}

interface EditUserFormData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export function UserActionsDialogue({ user }: UserActionsProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<EditUserFormData>({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);

  const onUpdateRole = async (data: { role: string }) => {
    const result = await updateUserRole(user.id, data.role);
    if (result.success) {
      toast.success("Role updated successfully");
      reset({
        role: data.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
      setIsRoleDialogOpen(false);
    } else {
      toast.error(result.error || "Failed to update role");
    }
  };

  const onDeactivateUser = async () => {
    const result = await deactivateUser(user.id);
    if (result.success) {
      toast.success("User deactivated successfully");
      setIsDeactivateDialogOpen(false);
    } else {
      toast.error(result.error || "Failed to deactivate user");
    }
  };

  const onEditUser = async (data: EditUserFormData) => {
    const result = await updateUserDetails(user.id, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: data.role,
    });
    if (result.success) {
      toast.success("User details updated successfully");
      reset(data); // Update form with new values
      setIsEditDialogOpen(false);
    } else {
      toast.error(result.error || "Failed to update user details");
    }
  };

  return (
    <div className="flex space-x-2">
      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={user.role === "admin"}
            title="Edit User"
            className="rounded-md border-gray-200 text-gray-600 hover:bg-theme-50 hover:text-theme-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-theme-200"
          >
            <User className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User: {user.email}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onEditUser)} className="space-y-4">
            <div>
              <Label
                htmlFor="firstName"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                First Name
              </Label>
              <Input
                id="firstName"
                {...register("firstName", {
                  required: "First name is required",
                })}
                className="mt-1 rounded-lg border-gray-200 bg-white py-2 px-4 text-sm shadow-sm focus:border-theme-300 focus:ring-theme-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-theme-200 dark:focus:ring-theme-200"
                disabled={isSubmitting}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-coral-600">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <Label
                htmlFor="lastName"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Last Name
              </Label>
              <Input
                id="lastName"
                {...register("lastName", { required: "Last name is required" })}
                className="mt-1 rounded-lg border-gray-200 bg-white py-2 px-4 text-sm shadow-sm focus:border-theme-300 focus:ring-theme-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-theme-200 dark:focus:ring-theme-200"
                disabled={isSubmitting}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-coral-600">
                  {errors.lastName.message}
                </p>
              )}
            </div>
            <div>
              <Label
                htmlFor="email"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    message: "Invalid email address",
                  },
                })}
                className="mt-1 rounded-lg border-gray-200 bg-white py-2 px-4 text-sm shadow-sm focus:border-theme-300 focus:ring-theme-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-theme-200 dark:focus:ring-theme-200"
                disabled={true}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-coral-600">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label
                htmlFor="role"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Role
              </Label>
              <Select
                disabled={isSubmitting || user.role === "admin"}
                defaultValue={user.role}
                onValueChange={(value) =>
                  setValue("role", value, { shouldValidate: true })
                }
                {...register("role", { required: "Role is required" })}
              >
                <SelectTrigger className="mt-1 rounded-lg border-gray-200 bg-white py-2 px-4 text-sm shadow-sm focus:border-theme-300 focus:ring-theme-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-theme-200 dark:focus:ring-theme-200">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Roles</SelectLabel>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    {/* <SelectItem value="admin">Admin</SelectItem> */}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="mt-1 text-sm text-coral-600">
                  {errors.role.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-theme-500 text-white hover:theme-500 dark:bg-theme-300 dark:hover:bg-theme-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={user.role === "admin"}
            title="Edit Role"
            className="rounded-md border-gray-200 text-gray-600 hover:bg-theme-50 hover:text-theme-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-theme-200"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Role for {user.email}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onUpdateRole)} className="space-y-4">
            <div>
              <Label
                htmlFor="role"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Role
              </Label>
              <Select
                disabled={isSubmitting || user.role === "admin"}
                defaultValue={user.role}
                onValueChange={(value) =>
                  setValue("role", value, { shouldValidate: true })
                }
                {...register("role", { required: "Role is required" })}
              >
                <SelectTrigger className="mt-1 rounded-lg border-gray-200 bg-white py-2 px-4 text-sm shadow-sm focus:border-theme-300 focus:ring-theme-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-theme-200 dark:focus:ring-theme-200">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Roles</SelectLabel>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="mt-1 text-sm text-coral-600">
                  {errors.role.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-theme-500 text-white hover:theme-500 dark:bg-theme-300 dark:hover:bg-theme-500"
                disabled={isSubmitting || user.role === "admin"}
              >
                {isSubmitting ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate User Dialog */}
      <Dialog
        open={isDeactivateDialogOpen}
        onOpenChange={setIsDeactivateDialogOpen}
      >
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={user.role === "admin"}
            title="Deactivate User"
            className="rounded-md border-coral-500/10 text-coral-600 hover:bg-coral-600/20 hover:text-theme-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-theme-200"
          >
            <Trash2 className="h-4 w-4 text-coral-600" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to deactivate {user.email}? This action cannot
            be undone.
          </p>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={onDeactivateUser}
              disabled={isSubmitting || user.role === "admin"}
              className="bg-coral-600 text-white hover:bg-coral-700 dark:bg-coral dark:hover:bg-coral-600"
            >
              {isSubmitting ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
