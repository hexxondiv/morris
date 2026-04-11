import { usePageHeader } from "@/app/store";

export function usePageHead() {
  try {
    const header = usePageHeader((state) => state.header);
    return header || "Dashboard";
  } catch {
    return "Dashboard";
  }
}