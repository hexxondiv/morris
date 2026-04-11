"use client";

import { toast } from "sonner";

type NotificationType = "success" | "error" | "info" | "warning" | "loading";

interface NotifyOptions {
  title?: string;
  description?: string;
  type?: NotificationType;
  duration?: number;
}

export function notify({
  title,
  description,
  type = "info",
  duration = 3000,
}: NotifyOptions) {
  switch (type) {
    case "success":
      toast.success(title || "Success", {
        description,
        duration,
      });
      break;
    case "error":
      toast.error(title || "Error", {
        description,
        duration,
      });
      break;
    case "warning":
      toast.warning(title || "Warning", {
        description,
        duration,
      });
      break;
    case "loading":
      toast.loading(title || "Loading...", {
        description,
        duration,
      });
      break;
    default:
      toast(title || "Notice", {
        description,
        duration,
      });
      break;
  }
}
