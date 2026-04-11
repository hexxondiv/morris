import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

interface Event {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  project_id: string | null;
  project_title?: string | null;
  recording_url: string | null;
  recording_password: string | null; // Added
  start_date: string;
  end_date: string;
  location: string | null;
  status: "upcoming" | "ongoing" | "completed" | "canceled";
  created_at: string;
  updated_at: string | null;
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("events")
      .select(
        `
        id,
        creator_id,
        title,
        description,
        project_id,
        recording_url,
        recording_password,
        start_date,
        end_date,
        location,
        status,
        created_at,
        updated_at,
        projects (title)
      `
      )
      .order("start_date", { ascending: true });

    if (error) {
      console.error("Error fetching events:", error);
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: 500 }
      );
    }

    const events: Event[] = data.map((item) => ({
      id: item.id,
      creator_id: item.creator_id,
      title: item.title,
      description: item.description,
      project_id: item.project_id ? item.project_id.toString() : null,
      project_title: item.projects?.[0]?.title || null,
      recording_url: item.recording_url,
      recording_password: item.recording_password,
      start_date: item.start_date,
      end_date: item.end_date,
      location: item.location,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return NextResponse.json(events, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
