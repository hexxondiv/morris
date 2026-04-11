// app/(dashboard)/dashboard/account/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { EditProfileForm } from "@/components/components/edit-profile-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: "user" | "moderator" | "editor" | "admin";
  created_at: string;
  updated_at: string | null;
}

export default function AccountPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  const [apiProfile, setApiProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger re-fetch

  // Redirect if not authenticated
  useEffect(() => {
    if (userLoaded && !user) {
      router.push("/sign-in");
    }
  }, [user, userLoaded, router]);

  // Fetch profile from API
  useEffect(() => {
    if (!user || !userLoaded) return;

    let isCurrent = true;

    async function fetchProfile() {
      try {
        if (!user?.id) return;
        setIsLoading(true);
        const response = await fetch(`/api/users/${user.id}`, {
          cache: "no-store", // Ensure fresh data
        });
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }
        const data: Profile = await response.json();
        if (isCurrent) {
          setApiProfile(data);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }
    fetchProfile();

    return () => {
      isCurrent = false; // Prevent state updates after unmount
    };
  }, [user?.id, userLoaded, refreshTrigger]); // Re-run on refreshTrigger

  // Memoize displayProfile
  const displayProfile = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      email:
        apiProfile?.email || user.primaryEmailAddress?.emailAddress || "N/A",
      first_name: apiProfile?.first_name || user.firstName || "",
      last_name: apiProfile?.last_name || user.lastName || "",
      avatar_url: apiProfile?.avatar_url || user.imageUrl || "",
      role:
        apiProfile?.role ||
        (user.publicMetadata?.role as
          | "user"
          | "moderator"
          | "editor"
          | "admin") ||
        "user",
    };
  }, [user, apiProfile]);

  // Callback to trigger profile refresh
  const handleProfileUpdate = () => {
    setRefreshTrigger((prev) => prev + 1); // Force re-fetch
    setIsEditing(false); // Close edit form
  };

  if (!user || !userLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-theme-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-theme-500 animate-spin" />
      </div>
    );
  }

  if (!displayProfile) return null;

  return (
    <div className="min-h-screen bg-theme-50 flex items-center justify-center py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
        <Card className="bg-white dark:bg-theme-50/95 border-none shadow-sm rounded-xl">
          <CardHeader className="p-6 sm:p-8">
            <div className="flex justify-between items-center">
              <h1 className="text-xl sm:text-2xl font-semibold text-theme-900">
                Your Profile
              </h1>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-theme-500 hover:text-theme-600 hover:bg-theme-100"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            {isEditing ? (
              <EditProfileForm
                profile={{
                  first_name: displayProfile.first_name,
                  last_name: displayProfile.last_name,
                  avatar_url: displayProfile.avatar_url,
                  email: displayProfile.email,
                  role: displayProfile.role,
                }}
                onCancel={() => setIsEditing(false)}
                onSave={handleProfileUpdate}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4 sm:gap-6">
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-theme-100">
                    <AvatarImage
                      src={displayProfile.avatar_url}
                      alt="Profile avatar"
                    />
                    <AvatarFallback className="bg-theme-100 text-theme-500 text-base sm:text-lg">
                      {displayProfile.first_name?.[0] ||
                        displayProfile.email[0]?.toUpperCase() ||
                        "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-lg sm:text-xl font-medium text-theme-900">
                      {displayProfile.first_name || displayProfile.last_name
                        ? `${displayProfile.first_name} ${displayProfile.last_name}`.trim()
                        : "No name provided"}
                    </h2>
                    <p className="text-sm sm:text-base text-stone-200 mt-1">
                      {displayProfile.email}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-stone-200 font-medium">
                      Role
                    </p>
                    <p className="text-sm sm:text-base text-theme-900 capitalize">
                      {displayProfile.role}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-stone-200 font-medium">
                      Joined
                    </p>
                    <p className="text-sm sm:text-base text-theme-900">
                      {formatDate(user?.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
