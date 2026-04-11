import ProjectView from "@/components/components/project-view";
import { getCookieHeader } from "@/lib/clerk";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Await the params Promise
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  
  const cookieHeader = await getCookieHeader();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/${slug}`,
    {
      headers: {
        Cookie: cookieHeader,
      },
      cache: "no-store",
    }
  );
  
  if (!response.ok) {
    console.error("Failed to fetch project:", response.statusText);
  }

  const data = await response.json();


  return (
    <>
      <ProjectView
        project={data.project}
        isAdminView={data.isAdminView}
      />
    </>
  );
}