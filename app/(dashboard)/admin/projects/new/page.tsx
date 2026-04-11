import ProjectForm from "@/components/components/project-form";
import { getSession } from "@/lib/auth/server";
import { normalizeRole } from "@/lib/auth/roles";
import { isAuthorized } from "@/lib/utils";
import { redirect } from "next/navigation";

const page = async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  const role = normalizeRole(session.user.role);
  if (!isAuthorized(role, "admin")) {
    redirect("/unauthorized");
  }

  return (
    <main className="max-w-[75rem] w-full mx-auto">
      <div className="container max-w-3xl mx-auto mb-12">
        <ProjectForm />
      </div>
    </main>
  );
};

export default page;
