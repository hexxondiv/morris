import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import slugify from "slugify";
import { requireRole } from "@/lib/auth/server";
import { projectSchema } from "@/lib/zod-schema";
import {
  createProjectRecord,
  isProjectSlugTaken,
  listProjects,
  mapProjectDetailRow,
  syncProjectVotingPeriodByStatus,
} from "@/lib/repositories/project-repository";

const querySchema = z.object({
  page: z
    .string()
    .nullable()
    .optional()
    .transform((val) => {
      if (!val) return 1;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 1 : Math.max(1, parsed);
    }),
  limit: z
    .string()
    .nullable()
    .optional()
    .transform((val) => {
      if (!val) return 10;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 10 : Math.min(100, Math.max(1, parsed));
    }),
  statuses: z
    .string()
    .nullable()
    .optional()
    .transform((str) =>
      str
        ? str.split(",").filter(Boolean)
        : ["proposed", "voting", "active", "completed"]
    ),
  search: z
    .string()
    .nullable()
    .optional()
    .transform((str) =>
      str && str.trim().length >= 2 ? str.trim() : undefined
    ),
  includeHidden: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val === "true"),
  columns: z
    .string()
    .nullable()
    .optional()
    .transform((str) => (str ? str.split(",").filter(Boolean) : undefined)),
  sortBy: z
    .string()
    .nullable()
    .optional()
    .transform((val) => {
      const validValues = [
        "created_at",
        "updated_at",
        "title",
        "current_amount",
      ];
      return validValues.includes(val || "") ? val : "created_at";
    }),
  sortOrder: z
    .string()
    .nullable()
    .optional()
    .transform((val) => {
      return val === "asc" ? "asc" : "desc";
    }),
  paginate: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val !== "false"),
});

export async function POST(request: NextRequest) {
  const auth = await requireRole("moderator");
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const validatedData = projectSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Invalid project data",
          details: validatedData.error.issues,
        },
        { status: 400 }
      );
    }

    const d = validatedData.data;
    const generatedSlug = d.title
      ? slugify(d.title.toLowerCase(), { lower: true, strict: true })
      : d.slug?.trim() || "";

    if (!generatedSlug) {
      return NextResponse.json(
        { error: "Could not derive a URL slug from the project title" },
        { status: 400 }
      );
    }

    if (await isProjectSlugTaken(generatedSlug)) {
      return NextResponse.json(
        { error: "Project slug already exists" },
        { status: 409 }
      );
    }

    if (d.status === "voting" && (!d.start_date || !d.end_date)) {
      return NextResponse.json(
        {
          error: "Voting status requires start_date and end_date",
        },
        { status: 400 }
      );
    }

    try {
      const row = await createProjectRecord({
        creatorId: auth.userId,
        slug: generatedSlug,
        title: d.title,
        description: d.description,
        goalAmount: d.goal_amount,
        currentAmount: d.current_amount ?? 0,
        status: d.status,
        state: d.state ?? null,
        country: d.country ?? null,
        sector: d.sector ?? null,
        bodyHtml: d.body_html ?? null,
        coverImageUrl: d.cover_image ?? null,
      });

      await syncProjectVotingPeriodByStatus({
        projectId: row.id,
        apiStatus: d.status,
        startDateIso: d.start_date,
        endDateIso: d.end_date,
      });

      return NextResponse.json({
        project: mapProjectDetailRow({ ...row, votingPeriod: null }),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "Project slug already exists" },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawParams = {
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      statuses: searchParams.get("statuses"),
      search: searchParams.get("search"),
      includeHidden: searchParams.get("includeHidden"),
      columns: searchParams.get("columns"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
      paginate: searchParams.get("paginate"),
    };

    const params = querySchema.parse(rawParams);

    const { rows: data, total: totalCount } = await listProjects({
      page: params.page,
      limit: params.limit,
      statuses: params.statuses,
      search: params.search,
      includeHidden: params.includeHidden,
      paginate: params.paginate,
      sortBy: (params.sortBy ?? "created_at") as
        | "created_at"
        | "updated_at"
        | "title"
        | "current_amount",
      sortOrder: params.sortOrder,
    });

    const totalPages = params.paginate
      ? Math.ceil(totalCount / params.limit)
      : 1;
    const hasNext = params.paginate ? params.page < totalPages : false;
    const hasPrevious = params.paginate ? params.page > 1 : false;

    let statusFilters = params.statuses;
    if (!params.includeHidden) {
      statusFilters = statusFilters.filter((status) => status !== "draft");
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount,
        totalPages,
        hasNext,
        hasPrevious,
        paginate: params.paginate,
      },
      filters: {
        statuses: statusFilters,
        search: params.search || null,
        includeHidden: params.includeHidden,
      },
      meta: {
        count: data?.length || 0,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
