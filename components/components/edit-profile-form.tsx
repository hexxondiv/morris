// components/components/edit-profile-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { saveProfile } from "@/lib/actions/users";

interface EditProfileFormProps {
  profile: {
    first_name: string;
    last_name: string;
    avatar_url: string;
    email: string;
    role: "user" | "moderator" | "editor" | "admin";
  };
  onCancel: () => void;
  onSave: () => void;
}

export function EditProfileForm({ profile, onCancel, onSave }: EditProfileFormProps) {
  const [formData, setFormData] = useState({
    first_name: profile.first_name,
    last_name: profile.last_name,
    avatar_url: profile.avatar_url,
  });
  const [avatarPreview, setAvatarPreview] = useState<string>(profile.avatar_url);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { userId } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", "avatars");

      const res = await fetch(`/api/users/${userId}/upload-avatar`, {
        method: "POST",
        body: formData,
      });

      const result: { url?: string; error?: string } = await res.json();

      if (res.ok && result.url) {
        setAvatarPreview(result.url);
        setFormData((prev) => ({ ...prev, avatar_url: result.url ?? ""}));
      } else {
        throw new Error(result.error || "Failed to upload avatar");
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error(error instanceof Error ? error.message : "Error uploading avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Please sign in to update your profile");
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveProfile({
          first_name: formData.first_name,
          last_name: formData.last_name,
          avatar_url: formData.avatar_url,
          email: profile.email, // Include non-editable email
          role: profile.role, // Include non-editable role
        });
        if (!result.success) throw new Error(result.error || "Failed to update profile");
        toast.success("Profile updated successfully");
        onSave(); // Trigger refresh
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update profile");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-center">
        <div className="relative group">
          <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden border-2 border-theme-100">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Avatar preview"
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-theme-100 flex items-center justify-center text-theme-500 text-lg sm:text-xl">
                {formData.first_name?.[0] || "?"}
              </div>
            )}
          </div>
          <label
            htmlFor="avatar-upload"
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-xs sm:text-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Upload className="h-4 w-4 mr-1" />
            Upload
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
            disabled={isUploading || isPending}
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name" className="text-xs sm:text-sm text-stone-200">
            First Name
          </Label>
          <Input
            id="first_name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            className="mt-1 text-xs sm:text-sm bg-theme-50 border-stone-100 text-theme-900 focus:ring-theme-500"
            disabled={isPending || isUploading}
          />
        </div>
        <div>
          <Label htmlFor="last_name" className="text-xs sm:text-sm text-stone-200">
            Last Name
          </Label>
          <Input
            id="last_name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            className="mt-1 text-xs sm:text-sm bg-theme-50 border-stone-100 text-theme-900 focus:ring-theme-500"
            disabled={isPending || isUploading}
          />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="text-xs sm:text-sm border-stone-100 text-theme-900 hover:bg-theme-100"
          disabled={isPending || isUploading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="text-xs sm:text-sm bg-theme-500 text-theme-50 hover:bg-theme-600"
          disabled={isPending || isUploading}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}