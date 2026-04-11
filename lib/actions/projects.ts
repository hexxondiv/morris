import { revalidatePath } from "next/cache";



export async function createProject(data: { name: string; status: string; budget: number; creatorId: string }) {
  // ... (existing logic)
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  return { success: true };
}

export async function updateProject(projectId: string, data: { name?: string; status?: string; budget?: number; progress?: number }) {
  // ... (existing logic)
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  return { success: true, error: null };
}

export async function deleteProject(projectId: string) {
  // ... (existing logic)
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  return { success: true, error: null };
}