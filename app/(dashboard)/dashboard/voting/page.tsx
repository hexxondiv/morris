import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { ProjectVoteSection } from "@/components/components/project-vote-section";
import { canUserVote } from "@/lib/actions";
import Image from "next/image";
import { format } from "date-fns";
import { toNaira } from "@/lib/utils";
import DonateButton from "@/components/components/donate-button";
import { requireAuth } from "@/lib/auth/server";
import { listVotingDashboardProjects } from "@/lib/services/voting-service";

export default async function VotingPage() {
  const auth = await requireAuth();
  if (!auth.authorized) redirect("/sign-in");

  const userId = auth.userId;
  const { canVote, message } = await canUserVote(userId);
  const projects = await listVotingDashboardProjects(userId);

  return (
    <div className="min-h-screen bg-theme-50">
      <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-7xl">
        <h1 className="text-2xl sm:text-3xl font-semibold text-theme-900 dark:text-theme-900 mb-6">
          Active Projects
        </h1>
        <Alert className="mb-6 sm:mb-8 bg-white dark:bg-theme-50/90 border-theme-200 dark:border-theme-200">
          <Info className="h-4 w-4 text-theme-500" />
          <AlertTitle className="text-theme-700 text-base sm:text-lg">
            Voting Eligibility
          </AlertTitle>
          <AlertDescription className="text-theme-600 text-sm sm:text-base flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span>{message}</span>
            {!canVote && (
              <DonateButton />
            )}
          </AlertDescription>
        </Alert>
        {projects.length === 0 ? (
          <div className="text-center text-stone-200 text-sm sm:text-base py-12">
            No projects are currently open for voting.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="bg-white dark:bg-theme-50/90 border-none shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4 sm:p-6">
                  {project.cover_image ? (
                    <div className="relative w-full h-32 sm:h-40 mb-4 rounded-md overflow-hidden">
                      <Image
                        src={project.cover_image}
                        alt={`${project.title} cover`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 sm:h-40 mb-4 bg-stone-100 dark:bg-theme-200 rounded-md flex items-center justify-center">
                      <span className="text-stone-200 text-xs sm:text-sm">
                        No Image
                      </span>
                    </div>
                  )}
                  <h2 className="text-lg sm:text-xl font-medium text-theme-900 mb-2 sm:mb-3">
                    {project.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-200 mb-3 sm:mb-4 line-clamp-3">
                    {project.description}
                  </p>
                  <div className="text-xs sm:text-sm text-stone-200 mb-2 sm:mb-3 flex justify-between">
                    Goal: <span>{toNaira(project.goal_amount)}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-stone-200 mb-2 sm:mb-3 flex justify-between">
                    Voting Starts:{" "}
                    <span>
                      {project.start_date
                        ? format(
                            new Date(project.start_date),
                            "MMM d, yyyy, h:mm a"
                          )
                        : "N/A"}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-stone-200 mb-3 sm:mb-4  flex justify-between">
                    Voting Ends:{" "}
                    <span>
                      {project.end_date
                        ? format(
                            new Date(project.end_date),
                            "MMM d, yyyy, h:mm a"
                          )
                        : "N/A"}
                    </span>
                  </div>

                  <div
                    className="border-t border-stone-200"
                    style={{ margin: "1rem 0" }}
                  />
                  <ProjectVoteSection project={project} canVote={canVote} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
