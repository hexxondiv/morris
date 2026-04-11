import ProjectsPage from "@/components/components/project-page";

export default function Projects() {
  return (
    <ProjectsPage
      initialStatuses={["draft","proposed", "voting", "active", "completed"]}
      isAdminView={true}
      title="Discover Projects"
      subtitle="Explore innovative projects making a difference in communities across Nigeria"
      allowStatusFilter={true}
      allowSearch={true}
      allowViewModeToggle={true}
      pageSize={6}
    />
  );
}