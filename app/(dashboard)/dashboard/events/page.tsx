"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Link2 } from "lucide-react";
import Link from "next/link";
import { useCurrentSession } from "@/lib/auth-client";

interface Event {
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
}

export default function EventsPage() {
  const { data: session, status } = useCurrentSession();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<{ [key: string]: boolean }>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
    }
  }, [router, status]);

  // Fetch events
  useEffect(() => {
    if (!session?.user) return;

    let isCurrent = true;

    async function fetchEvents() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/events", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to fetch events");
        const eventsData: Event[] = await response.json();
        if (isCurrent) setEvents(eventsData);
      } catch (error) {
        console.error("Error fetching events:", error);
        toast.error("Failed to load events");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }
    fetchEvents();

    return () => {
      isCurrent = false;
    };
  }, [session?.user, status]);

  // Toggle description visibility
  const toggleDescription = (eventId: string) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-theme-50 flex items-center justify-center">
        <div className="h-8 w-8 text-theme-500 animate-spin" />
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-theme-50 py-8 sm:py-12 space-y-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <h3 className="text-lg sm:text-xl font-medium pl-2 text-theme-900">Events</h3>
        {events.length === 0 ? (
          <p className="text-sm text-stone-200 pl-2">No events found.</p>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <Card
                key={event.id}
                className="overflow-hidden rounded-2xl bg-white border-none shadow-sm"
              >
                <CardContent className="p-7 sm:p-8 space-y-3">
                  <div className="flex flex-col gap-4">
                    <h4 className="text-sm font-medium text-stone-200">
                      {event.location ? `${event.location} - ` : ""}{" "}
                      {new Date(event.start_date).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      @{" "}
                      {new Date(event.start_date).toLocaleString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "GMT",
                        hour12: true,
                      })}{" "}
                      GMT
                    </h4>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-medium text-theme-900">
                    {event.title}
                  </h2>
                  <div>
                    <div
                      className={`text-sm text-stone-200 pt-2 ${
                        expandedEvents[event.id] ? "block" : "hidden"
                      }`}
                    >
                      <p>{event.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      className="flex items-center text-left text-theme-500 mt-2 p-0 hover:bg-transparent"
                      onClick={() => toggleDescription(event.id)}
                    >
                      <span className="text-sm font-medium">
                        {expandedEvents[event.id] ? "Show less" : "Show description"}
                      </span>
                      <span className="ml-1 flex h-7 items-center">
                        {expandedEvents[event.id] ? (
                          <ChevronUp className="h-4 w-4 text-theme-500 transition-transform duration-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-theme-500 transition-transform duration-500" />
                        )}
                      </span>
                    </Button>
                  </div>
                  <div className="pt-2 flex flex-col gap-5">
                    {event.recording_url && (
                      <a
                        href={event.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-center font-sans font-medium inline-flex items-center justify-center rounded-2xl border border-stone-100 bg-white shadow-sm text-theme-900 transition-all duration-300 hover:border-theme-500 hover:text-theme-900 hover:ring-4 hover:ring-theme-500/10 h-16 px-6 text-lg"
                      >
                        <Link2 className="h-5 w-5 mr-2" />
                        View recording
                      </a>
                    )}
                    {event.recording_password && (
                      <p className="text-base font-medium text-stone-200">
                        PW: {event.recording_password}
                      </p>
                    )}
                    {event.project_id && (
                      <p className="text-sm text-stone-200">
                        <span className="font-medium">Project:</span>{" "}
                        <Link
                          href={`/dashboard/projects/${event.project_id}`}
                          className="text-theme-500 hover:underline"
                        >
                          {event.project_title || "View Project"}
                        </Link>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
