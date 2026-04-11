import { ProjectSchema } from "@/lib/zod-schema";
import { ProjectCard } from "./project-card";

interface ProjectsGridProps {
  projects: (ProjectSchema & { id?: string; slug?: string })[];
  isAdminView?: boolean;
  gridClassName?: string;
  viewMode?: 'grid' | 'list';
}

export function ProjectsGrid({
  projects,
  isAdminView = false,
  gridClassName = 'grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  viewMode = 'grid'
}: ProjectsGridProps) {
  if (projects.length === 0) {
    return null; // Let the parent handle empty state
  }

  return (
    <div className={viewMode === 'list' ? 'space-y-6' : gridClassName}>
      {projects.map((project, idx) => (
        <ProjectCard
          key={project.id ? `${project.id}-${idx}` : idx} 
          project={project} 
          isAdminView={isAdminView}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
}