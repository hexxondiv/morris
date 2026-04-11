import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { MigrationReport } from "./report";

const CORE_TABLES = [
  "profiles",
  "projects",
  "pledges",
  "transactions",
  "votes",
  "voting_periods",
  "settings",
] as const;

const OPTIONAL_TABLES = [
  "project_timelines",
  "project_stages",
  "cases",
  "case_files",
  "events",
] as const;

async function fetchAllRows(
  client: SupabaseClient,
  table: string,
  report: MigrationReport
): Promise<Record<string, unknown>[]> {
  const pageSize = 1000;
  let offset = 0;
  const out: Record<string, unknown>[] = [];
  for (;;) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .range(offset, offset + pageSize - 1);
    if (error) {
      throw new Error(`Supabase export failed for "${table}": ${error.message}`);
    }
    const batch = (data ?? []) as Record<string, unknown>[];
    out.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  report.log("info", `Exported ${out.length} rows from ${table}`);
  return out;
}

async function tryFetchOptional(
  client: SupabaseClient,
  table: string,
  report: MigrationReport
): Promise<Record<string, unknown>[]> {
  try {
    return await fetchAllRows(client, table, report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    report.log("warn", `Optional table "${table}" not exported`, { reason: msg });
    return [];
  }
}

export type ExportOptions = {
  outDir: string;
  report: MigrationReport;
};

export async function runSupabaseExport(opts: ExportOptions): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.LEGACY_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.LEGACY_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or LEGACY_* equivalents)."
    );
  }

  mkdirSync(opts.outDir, { recursive: true });
  const client = createClient(url, key, { auth: { persistSession: false } });

  for (const table of CORE_TABLES) {
    const rows = await fetchAllRows(client, table, opts.report);
    writeFileSync(join(opts.outDir, `${table}.json`), JSON.stringify(rows, null, 2), "utf8");
  }

  for (const table of OPTIONAL_TABLES) {
    const rows = await tryFetchOptional(client, table, opts.report);
    writeFileSync(join(opts.outDir, `${table}.json`), JSON.stringify(rows, null, 2), "utf8");
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    supabaseUrlHost: new URL(url).host,
    tables: [...CORE_TABLES, ...OPTIONAL_TABLES],
  };
  writeFileSync(join(opts.outDir, "export-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  opts.report.log("info", `Export complete under ${opts.outDir}`);
}
