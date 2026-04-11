import { prisma } from "@/lib/db/prisma";
import { eventStatusToApi } from "@/lib/repositories/mappers";

export type PublicEventRow = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  project_id: string | null;
  project_title?: string | null;
  recording_url: string | null;
  recording_password: string | null;
  start_date: string;
  end_date: string;
  location: string | null;
  status: "upcoming" | "ongoing" | "completed" | "canceled";
  created_at: string;
  updated_at: string | null;
};

export async function listEventsForPublicDashboard(): Promise<PublicEventRow[]> {
  const rows = await prisma.event.findMany({
    include: { project: { select: { title: true } } },
    orderBy: { startAt: "asc" },
  });

  return rows.map((e) => ({
    id: e.id,
    creator_id: e.creatorId ?? "",
    title: e.title,
    description: e.description ?? "",
    project_id: e.projectId,
    project_title: e.project?.title ?? null,
    recording_url: e.recordingUrl,
    recording_password: e.recordingPassword,
    start_date: e.startAt.toISOString(),
    end_date: (e.endAt ?? e.startAt).toISOString(),
    location: e.location,
    status: eventStatusToApi(e.status) as PublicEventRow["status"],
    created_at: e.createdAt.toISOString(),
    updated_at: e.updatedAt.toISOString(),
  }));
}
