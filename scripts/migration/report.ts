import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type ReportLevel = "info" | "warn" | "error";

export type BatchSummary = {
  batch: string;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export class MigrationReport {
  readonly startedAt = new Date().toISOString();
  readonly batches: BatchSummary[] = [];
  readonly lines: string[] = [];
  readonly ambiguities: string[] = [];

  log(level: ReportLevel, message: string, meta?: Record<string, unknown>) {
    const ts = new Date().toISOString();
    const extra = meta ? ` ${JSON.stringify(meta)}` : "";
    const line = `[${ts}] [${level.toUpperCase()}] ${message}${extra}`;
    this.lines.push(line);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }

  ambiguity(message: string) {
    this.ambiguities.push(message);
    this.log("warn", `AMBIGUITY: ${message}`);
  }

  batch(summary: BatchSummary) {
    this.batches.push(summary);
    this.log(
      "info",
      `Batch ${summary.batch}: inserted=${summary.inserted} updated=${summary.updated} skipped=${summary.skipped} errors=${summary.errors.length}`
    );
    for (const e of summary.errors) this.log("error", e);
  }

  writeJson(path: string | undefined, payload: unknown) {
    if (!path) return;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(payload, null, 2), "utf8");
    this.log("info", `Wrote report JSON: ${path}`);
  }

  summaryPayload() {
    return {
      startedAt: this.startedAt,
      finishedAt: new Date().toISOString(),
      batches: this.batches,
      ambiguities: this.ambiguities,
      logLineCount: this.lines.length,
    };
  }
}
