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

function restBase(supabaseUrl: string): string {
  const u = supabaseUrl.replace(/\/$/, "");
  return `${u}/rest/v1`;
}

async function fetchAllRows(
  supabaseUrl: string,
  serviceKey: string,
  table: string,
  report: MigrationReport
): Promise<Record<string, unknown>[]> {
  const pageSize = 1000;
  let offset = 0;
  const out: Record<string, unknown>[] = [];
  const base = restBase(supabaseUrl);

  for (;;) {
    const url = new URL(`${base}/${table}`);
    url.searchParams.set("select", "*");

    const res = await fetch(url.toString(), {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Range: `${offset}-${offset + pageSize - 1}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Supabase export failed for "${table}" (${res.status}): ${text.slice(0, 500)}`
      );
    }

    const batch = (await res.json()) as Record<string, unknown>[];
    out.push(...batch);
    report.log("info", `Exported ${batch.length} rows from ${table} (offset ${offset})`);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  report.log("info", `Exported ${out.length} total rows from ${table}`);
  return out;
}

async function tryFetchOptional(
  supabaseUrl: string,
  serviceKey: string,
  table: string,
  report: MigrationReport
): Promise<Record<string, unknown>[]> {
  try {
    return await fetchAllRows(supabaseUrl, serviceKey, table, report);
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

  for (const table of CORE_TABLES) {
    const rows = await fetchAllRows(url, key, table, opts.report);
    writeFileSync(join(opts.outDir, `${table}.json`), JSON.stringify(rows, null, 2), "utf8");
  }

  for (const table of OPTIONAL_TABLES) {
    const rows = await tryFetchOptional(url, key, table, opts.report);
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
