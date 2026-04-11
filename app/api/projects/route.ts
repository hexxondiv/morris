import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Query parameters schema - properly handle null values from URLSearchParams
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

    // Parse and validate query parameters - handle null values properly
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
      ids: searchParams.get('ids')
    };

    const params = querySchema.parse(rawParams);

    // Build base query
    const selectColumns = params.columns ? params.columns.join(",") : "*";
    let query = supabaseAdmin
      .from("projects")
      .select(selectColumns, { count: "exact" });

    // Apply status filters
    let statusFilters = params.statuses;

    // Hide draft projects from regular users unless explicitly included
    if (!params.includeHidden) {
      statusFilters = statusFilters.filter((status) => status !== "draft");
    }

    if (statusFilters.length > 0) {
      query = query.in("status", statusFilters);
    }

    // Apply search filter
    if (params.search && params.search.trim().length >= 2) {
      query = query.or(
        `title.ilike.%${params.search}%,description.ilike.%${params.search}%`
      );
    }

    // Apply sorting
    query = query.order(params.sortBy ?? "created_at", {
      ascending: params.sortOrder === "asc",
    });

    // Apply pagination if requested
    if (params.paginate) {
      const offset = (params.page - 1) * params.limit;
      query = query.range(offset, offset + params.limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Database query failed", details: error.message },
        { status: 500 }
      );
    }

    // Calculate pagination metadata
    const totalCount = count || 0;
    const totalPages = params.paginate
      ? Math.ceil(totalCount / params.limit)
      : 1;
    const hasNext = params.paginate ? params.page < totalPages : false;
    const hasPrevious = params.paginate ? params.page > 1 : false;

    const response = {
      success: true,
      data: data || [],
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
    };

    return NextResponse.json(response);
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
