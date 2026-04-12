import { redirect } from "next/navigation";
import ProjectsPage from "@/components/components/project-page";

export default function Projects() {
  return (
    <ProjectsPage
      initialStatuses={["proposed", "voting", "active", "completed"]}
      isAdminView={false}
      title="Discover Projects"
      subtitle="Explore projects making a tangible difference in Aniocha North, Delta State."
      allowStatusFilter={true}
      allowSearch={true}
      allowViewModeToggle={false}
      pageSize={6}
    />
  );
}