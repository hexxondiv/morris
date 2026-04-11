import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

interface VotingProject {
  id: string;
  title: string;
  vote_count: number;
  oppose_count: number;
  has_voted: boolean;
  current_vote: boolean | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "";

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select(
        `
        id,
        title,
        votes(vote, user_id),
        voting_periods(start_date, end_date)
      `
      )
      .not("voting_periods", "is", null)
      .lte("voting_periods.start_date", now)
      .gte("voting_periods.end_date", now);

    if (error) {
      console.error("Supabase error:", error);
      throw new Error(error.message);
    }

    const projects: VotingProject[] = data.map((item) => {
      const userVote = item.votes?.find((v: any) => v.user_id === userId);
      return {
        id: item.id,
        title: item.title,
        vote_count: item.votes?.filter((v: any) => v.vote === true).length || 0,
        oppose_count: item.votes?.filter((v: any) => v.vote === false).length || 0,
        has_voted: !!userVote,
        current_vote: userVote ? userVote.vote : null,
      };
    });

    return NextResponse.json({ data: projects });
  } catch (error) {
    console.error("Error fetching voting projects:", error);
    return NextResponse.json({ error: "Failed to fetch voting projects" }, { status: 500 });
  }
}