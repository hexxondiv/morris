"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { List, Clock, TrendingUp } from "lucide-react";
import { useUserStore } from "@/app/store";
import { formatDate, toNaira } from "@/lib/utils";
import LogoLoader from "@/components/components/logo-loader";
import DonateButton from "@/components/components/donate-button";
import { ProjectSchema } from "@/lib/zod-schema";
import { ProjectsGrid } from "@/components/components/project-grid";
import Link from "next/link";
import ReceiptDownloadButton from "@/components/components/receipt-download-button";

interface DashboardData {
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    avatar_url?: string;
    created_at: string;
  };
  total_contributions: number;
  contributions_this_month: number;
  current_recurring_pledge: {
    pledge_id: string;
    project_id?: string;
    project_title?: string;
    amount: number;
    status: string;
    recurrence_interval: "monthly" | "quarterly" | "yearly";
  } | null;
  project_involvement: {
    project_id: string;
    project_title: string;
    total_contributed: number;
  }[];
  pledge_status_summary: {
    active: number;
    completed: number;
    pending: number;
  };
  recent_transactions: {
    id: string;
    amount: number;
    payment_method?: string;
    paid_at: string;
    project_title?: string;
    currency: string;
  }[];
  ongoing_projects: ProjectSchema[];
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { profile } = useUserStore();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/dashboard/user", {
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const result = await response.json();
        setData(result);
      } catch (error: any) {
        toast.error("Error fetching dashboard data", {
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      fetchDashboardData();
    }
  }, [profile]);

  if (!profile) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mt-12 text-theme-900"
      >
        Please log in to view your dashboard
      </motion.div>
    );
  }

  if (loading) return <LogoLoader />;

  if (!data) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mt-12 text-theme-900"
      >
        Error loading dashboard
      </motion.div>
    );
  }

  return (
    <>
      {/* Welcome Banner */}
      <Card className="bg-white shadow-sm rounded-lg">
        <CardContent className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <Avatar className="w-12 h-12 border-2 border-theme-200">
              {data.profile.avatar_url ? (
                <AvatarImage src={data.profile.avatar_url} alt="Avatar" />
              ) : (
                <AvatarFallback className="bg-theme-100 text-theme-700">
                  {data.profile.first_name[0]}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-theme-900">
                Welcome, {data.profile.first_name} {data.profile.last_name}
              </h1>
              <p className="text-theme-700">
                Manage your contributions and projects
              </p>
            </div>
          </div>
          <DonateButton size="lg" />

          {/* <Button
            variant="default"
            className="bg-theme-500 text-white hover:bg-theme-600 rounded-full"
            onClick={() => router.push("/dashboard/account")}
          >
            Edit Profile
          </Button> */}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Contributions */}
        <Card className="bg-white shadow-sm rounded-lg">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-medium text-theme-900">
                Your pledge
              </h2>
            </div>
            <motion.p
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-3xl font-bold text-theme-500"
            >
              {toNaira(data.current_recurring_pledge?.amount || 0)}
              <span className="text-sm text-gray-500">
                {" "}
                {data.current_recurring_pledge?.recurrence_interval
                  ? data.current_recurring_pledge.recurrence_interval.slice(
                      0,
                      -2
                    )
                  : "monthly"}
              </span>
            </motion.p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm rounded-lg">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-medium text-theme-900">
                Your contributions this month
              </h2>
            </div>
            <motion.p
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-3xl font-bold text-theme-500"
            >
              {toNaira(data.contributions_this_month)}
            </motion.p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm rounded-lg">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-medium text-theme-900">
                Your total contributions
              </h2>
            </div>
            <motion.p
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-3xl font-bold text-theme-500"
            >
              {toNaira(data.total_contributions)}
            </motion.p>
          </CardContent>
        </Card>
      </div>

      {/* Current Recurring Pledge */}
      {data.current_recurring_pledge && (
        <Card className="bg-white shadow-sm rounded-lg">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-6 h-6 text-theme-500" />
              <h2 className="text-xl font-medium text-theme-900">
                Current Recurring Pledge
              </h2>
            </div>
            <div className="space-y-2 text-theme-700">
              <p>
                <span className="font-medium">Project:</span>{" "}
                {data.current_recurring_pledge.project_title || "N/A"}
              </p>
              <p>
                <span className="font-medium">Amount:</span> ₦
                {data.current_recurring_pledge.amount.toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Status:</span>{" "}
                {data.current_recurring_pledge.status}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Involvement */}
      {/* <Card className="bg-white shadow-sm rounded-lg">
        <CardContent className="p-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="projects" className="border-none">
              <AccordionTrigger className="text-left text-xl font-medium text-theme-900 hover:no-underline">
                <div className="flex items-center space-x-3">
                  <List className="w-6 h-6 text-theme-500" />
                  <span>Top 5 Projects Supported</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-theme-700">
                {data.project_involvement.length === 0 ? (
                  <p className="text-theme-700">No projects supported yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <table className="min-w-full divide-y divide-theme-200">
                        <thead className="bg-theme-100">
                          <tr>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-theme-900 uppercase tracking-wider"
                            >
                              #
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-theme-900 uppercase tracking-wider"
                            >
                              Project Title
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-theme-900 uppercase tracking-wider"
                            >
                              Total Contributed
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-theme-200">
                          {data.project_involvement.map((tx, index) => (
                            <tr
                              key={tx.project_id}
                              className="hover:bg-theme-50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-theme-700">
                                {index + 1}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-theme-700">
                                {tx.project_title || "N/A"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-theme-700">
                                {toNaira(tx.total_contributed)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card> */}

      {/* Ongoing Projects */}
      <Card className="bg-white shadow-sm rounded-lg">
        <CardContent className="p-6">
          <Accordion
            type="single"
            collapsible
            className="w-full"
            defaultValue="projects"
          >
            <AccordionItem value="projects" className="border-none">
              <AccordionTrigger className="text-left text-xl font-medium text-theme-900 hover:no-underline">
                <div className="flex justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <List className="w-6 h-6 text-theme-500" />
                    <span>Ongoing Projects</span>
                  </div>
                  <Link
                    href="/projects"
                    className="inline-flex items-center text-base gap-2 px-4 py-2 bg-theme-500 hover:bg-theme-600 text-white font-medium rounded-xl transition-all hover:scale-105 shadow-lg mr-4"
                  >
                    View All Projects
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </Link>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-theme-700">
                {data.ongoing_projects.length === 0 ? (
                  <div className="flex flex-col items-center px-4 py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-theme-500 rounded-full mb-6">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>

                    <p className="text-theme-700 text-center">
                      No ongoing projects at the moment.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6">
                    <ProjectsGrid projects={data.ongoing_projects} />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Pledge Status Summary */}
      <Card className="bg-white shadow-sm rounded-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <List className="w-6 h-6 text-theme-500" />
            <h2 className="text-xl font-medium text-theme-900">
              Pledge Status
            </h2>
          </div>
          <div className="grid grid-cols-1 text-base sm:grid-cols-3 gap-6 text-theme-700">
            <div className="p-4 bg-theme-50 rounded-lg text-center">
              <p className="text-active font-bold text-2xl">
                {data.pledge_status_summary.active}
              </p>
              <p className="font-medium">Active</p>
            </div>
            <div className="p-4 bg-theme-50 rounded-lg text-center">
              <p className="text-theme-500 font-bold text-2xl">
                {data.pledge_status_summary.completed}
              </p>
              <p className="font-medium">Completed</p>
            </div>
            <div className="p-4 bg-theme-50 rounded-lg text-center">
              <p className="text-gold font-bold text-2xl">
                {data.pledge_status_summary.pending}
              </p>
              <p className="font-medium">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="bg-white shadow-sm rounded-lg">
        <CardContent className="p-6">
          <Accordion type="single" collapsible className="w-full" defaultValue="transactions">
            <AccordionItem value="transactions" className="border-none">
              <AccordionTrigger className="text-left text-xl font-medium text-theme-900 hover:no-underline">
                <div className="flex items-center space-x-3">
                  <Clock className="w-6 h-6 text-theme-500" />
                  <span>Recent Transactions</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-theme-700">
                {data.recent_transactions.length === 0 ? (
                  <p className="text-theme-700">No recent transactions</p>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden lg:block">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="rounded-lg border border-theme-200 overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-theme-100">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-theme-900 uppercase tracking-wider">
                                  Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-theme-900 uppercase tracking-wider">
                                  Project
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-theme-900 uppercase tracking-wider">
                                  Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-theme-900 uppercase tracking-wider">
                                  Payment Method
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-theme-900 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-theme-200">
                              {data.recent_transactions.map((tx) => (
                                <tr
                                  key={tx.id}
                                  className="hover:bg-theme-50 transition-colors"
                                >
                                  <td className="px-6 py-4 text-sm text-theme-700">
                                    {formatDate(tx.paid_at) ?? "N/A"}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-theme-700">
                                    <div
                                      className="max-w-[250px] truncate"
                                      title={tx.project_title || "N/A"}
                                    >
                                      {tx.project_title ||
                                        "General Contribution"}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-medium text-theme-700">
                                    {toNaira(tx.amount)}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-theme-700">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-theme-100 text-theme-800">
                                      {tx.payment_method || "N/A"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <ReceiptDownloadButton
                                      donorName={`${data.profile.first_name} ${data.profile.last_name}`}
                                      transaction={tx}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    </div>

                    {/* Tablet View */}
                    <div className="hidden md:block lg:hidden">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="rounded-lg border border-theme-200 overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-theme-100">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-theme-900 uppercase tracking-wider">
                                  Date
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-theme-900 uppercase tracking-wider">
                                  Project
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-theme-900 uppercase tracking-wider">
                                  Amount
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-theme-900 uppercase tracking-wider w-16">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-theme-200">
                              {data.recent_transactions.map((tx) => (
                                <tr
                                  key={tx.id}
                                  className="hover:bg-theme-50 transition-colors"
                                >
                                  <td className="px-4 py-4 text-sm text-theme-700">
                                    {formatDate(tx.paid_at)?.split(" ")[0] ??
                                      "N/A"}
                                  </td>
                                  <td className="px-4 py-4 text-sm text-theme-700">
                                    <div
                                      className="max-w-[180px] line-clamp-2"
                                      title={tx.project_title || "N/A"}
                                    >
                                      {tx.project_title || "General"}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-sm font-medium text-theme-700">
                                    {toNaira(tx.amount)}
                                  </td>
                                  <td className="px-4 py-4">
                                    <ReceiptDownloadButton
                                      donorName={`${data.profile.first_name} ${data.profile.last_name}`}
                                      transaction={tx}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-3"
                      >
                        {data.recent_transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="bg-theme-50 border border-theme-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-theme-900 line-clamp-2 text-sm">
                                  {tx.project_title || "General Contribution"}
                                </h4>
                              </div>
                              <div className="text-right ml-3">
                                <span className="font-bold text-theme-500 text-sm">
                                  {toNaira(tx.amount)}
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center">
                              <p className="text-xs text-theme-600 mt-1">
                                {formatDate(tx.paid_at) ?? "N/A"}
                              </p>
                              <ReceiptDownloadButton
                                donorName={`${data.profile.first_name} ${data.profile.last_name}`}
                                transaction={tx}
                              />
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </>
  );
};

export default Dashboard;
