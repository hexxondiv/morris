import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listProjects } from "@/lib/repositories/project-repository";

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
