import ProjectsPage from "@/components/components/project-page";

export default function Projects() {
  return (
    <ProjectsPage
      initialStatuses={["draft","proposed", "voting", "active", "completed"]}
      isAdminView={true}
      title="Discover Projects"
      subtitle="Explore projects making a tangible difference in Aniocha North, Delta State."
      allowStatusFilter={true}
      allowSearch={true}
      allowViewModeToggle={true}
      pageSize={6}
    />
  );
}