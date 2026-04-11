import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { MigrationReport } from "./report";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function rewriteString(
  s: string | null | undefined,
  fromPrefix: string,
  toPrefix: string
): string | null | undefined {
  if (s == null || s === "") return s;
  if (!s.startsWith(fromPrefix)) return s;
  return toPrefix + s.slice(fromPrefix.length);
}

export type UrlRewriteOptions = {
  transformDir: string;
  outDir?: string;
  fromPrefix: string;
  toPrefix: string;
  report: MigrationReport;
};

/**
 * Rewrites persisted public URLs (Supabase storage → S3 CDN, etc.) in transformed JSON payloads.
 * Writes updated files to `outDir` when set; otherwise overwrites files in `transformDir`.
 */
export function runUrlRewrite(opts: UrlRewriteOptions): void {
  const targetDir =
    opts.outDir && opts.outDir !== opts.transformDir ? opts.outDir : opts.transformDir;
  if (opts.outDir && opts.outDir !== opts.transformDir) {
    mkdirSync(opts.outDir, { recursive: true });
    for (const f of [
      "users.json",
      "projects.json",
      "transactions.json",
      "manifest.json",
      "identity_map.json",
      "pledges.json",
      "votes.json",
      "voting_periods.json",
      "settings.json",
      "project_timelines_raw.json",
    ]) {
      const src = join(opts.transformDir, f);
      if (existsSync(src)) copyFileSync(src, join(targetDir, f));
    }
  }

  const usersPath = join(targetDir, "users.json");
  const users = readJson<
    Array<{ id: string; email: string; avatarUrl: string | null; [k: string]: unknown }>
  >(usersPath);
  let nUser = 0;
  for (const u of users) {
    const next = rewriteString(u.avatarUrl, opts.fromPrefix, opts.toPrefix);
    if (next !== u.avatarUrl) {
      u.avatarUrl = next ?? null;
      nUser++;
    }
  }
  writeFileSync(usersPath, JSON.stringify(users, null, 2), "utf8");

  const projectsPath = join(targetDir, "projects.json");
  const projects = readJson<
    Array<{ id: string; coverImageUrl: string | null; [k: string]: unknown }>
  >(projectsPath);
  let nProj = 0;
  for (const p of projects) {
    const next = rewriteString(p.coverImageUrl, opts.fromPrefix, opts.toPrefix);
    if (next !== p.coverImageUrl) {
      p.coverImageUrl = next ?? null;
      nProj++;
    }
  }
  writeFileSync(projectsPath, JSON.stringify(projects, null, 2), "utf8");

  const txPath = join(targetDir, "transactions.json");
  const txs = readJson<Array<{ id: string; metadata: unknown; [k: string]: unknown }>>(txPath);
  let nMeta = 0;
  for (const t of txs) {
    if (!t.metadata || typeof t.metadata !== "object") continue;
    const m = JSON.stringify(t.metadata);
    if (!m.includes(opts.fromPrefix)) continue;
    const replaced = m.split(opts.fromPrefix).join(opts.toPrefix);
    try {
      t.metadata = JSON.parse(replaced) as unknown;
      nMeta++;
    } catch {
      opts.report.log("warn", `Could not JSON-rewrite metadata for transaction ${t.id}`);
    }
  }
  writeFileSync(txPath, JSON.stringify(txs, null, 2), "utf8");

  opts.report.log("info", `URL rewrite: avatar URLs touched=${nUser}, cover images=${nProj}, transaction metadata=${nMeta}`);
}
