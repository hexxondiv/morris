"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import ContributionEditForm from "./contribution-edit-form";

type DashboardUser = {
  firstName?: string | null;
  name?: string | null;
} | null;

interface DashboardProps {
  user: DashboardUser | undefined;
}
function DashboardTab({ user }: DashboardProps) {
  return (
    <>
      <Card className="my-6 p-4">
        <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 bg-theme-50 text-theme-500 rounded-lg">
          <div className="space-y-2 text-left">
            <h2 className="text-xl font-medium text-mud-900">
              <span className="hidden md:inline">✨</span> Our new community
              platform
            </h2>
            <p className="text-mud-700">
              Connect with other villagers and join the conversation
            </p>
          </div>
          <Link
            href="https://community.isee.co/join?invitation_token=5bc4a3eb546fadedbcac48239f0461d9a87a2ba5-182a6ff6-1122-4e04-9b55-c12e75e50333"
            target="_blank"
            className="button-secondary rounded-full !py-2.5 !px-6 text-base font-medium flex items-center justify-center"
            rel="noopener noreferrer"
          >
            Join the chat →
          </Link>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="space-y-6 p-8">
          <div className="flex space-x-4 border-b border-theme-50 pb-6">
            <span className="text-xl sm:text-3xl">👋🏾</span>
            <span className="text-lg sm:text-2xl font-medium">
              Welcome, {user?.firstName || user?.name || "there"}
            </span>
          </div>
          <div className="space-y-4">
            <div className="label text-theme-500">Your contribution</div>
            <ContributionEditForm />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-8 space-y-6">
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="item-1" className="overflow-hidden text">
              <AccordionTrigger className="text-left text-lg font-medium text-theme-500 lg:text-xl !no-underline hover:!no-underline focus:!no-underline">
                <div className="flex justify-between items-center">
                  <div className="text-xl font-medium text-mud-900 flex items-center space-x-3">
                    <span>To Do</span>
                    <span className="bg-theme-50 text-theme-500 px-3 py-2 rounded-lg text-sm">
                      0 / 3
                    </span>
                  </div>{" "}
                </div>
              </AccordionTrigger>

              <AccordionContent className="text-black text-base">
                <div className="space-y-4">
                  {[
                    {
                      title: "🎗️ Invite a friend",
                      description: "Invite a friend to join the community",
                      action: "Send invite",
                    },
                    {
                      title: "🥳 Spread the word",
                      description:
                        "Let friends know you're a proud member of the community!",
                      action: "Share",
                    },
                    {
                      title: "🪵 Join the conversation",
                      description:
                        "We're gathered and chatting away in our community forum.",
                      action: "Join conversation",
                      link: "https://community.isee.co/join?invitation_token=5bc4a3eb546fadedbcac48239f0461d9a87a2ba5-182a6ff6-1122-4e04-9b55-c12e75e50333",
                    },
                  ].map(({ title, description, action, link }, idx) => (
                    <div
                      key={idx}
                      className="relative flex items-start bg-theme-50 text-theme-500 p-5 rounded-xl"
                    >
                      <Checkbox className="mt-1 mr-4" />
                      <div className="text-sm space-y-3">
                        <div className="font-medium text-black text-lg">
                          {title}
                        </div>
                        <p className="text-theme-500 font-medium text-base">
                          {description}
                        </p>
                        {link ? (
                          <div className="block mt-1">
                            <Link
                              href={link}
                              target="_blank"
                              className="text-theme-500 font-medium text-base button-secondary rounded-full !py-2.5 mt-2"
                            >
                              {action} →
                            </Link>
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            className="button-secondary rounded-full !py-2.5"
                            onClick={() => alert(`${action} clicked!`)}
                          >
                            {action} →
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </>
  );
}
export default DashboardTab;
