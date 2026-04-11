/**
 * Legacy Supabase (+ optional Clerk JSON) → Prisma / MySQL migration CLI.
 *
 * Subcommands: export | transform | import | verify | rewrite-urls
 */
import { MigrationReport } from "./report";
import { runSupabaseExport } from "./supabase-export";
import { runTransform } from "./transform";
import { runPrismaImport } from "./import-prisma";
import { runVerify } from "./verify-migration";
import { runUrlRewrite } from "./url-rewrite";

function argValue(name: string, argv: string[]): string | undefined {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  return argv[i + 1];
}

function hasFlag(name: string, argv: string[]): boolean {
  return argv.includes(name);
}

function printHelp() {
  console.log(`
Morris data migration CLI (workstream 08)

Usage:
  tsx scripts/migration/cli.ts export --out-dir <path>
  tsx scripts/migration/cli.ts transform --export-dir <path> --out-dir <path> [--clerk-export <path>] [--identity-map <path>]
  tsx scripts/migration/cli.ts import --transform-dir <path> [--dry-run] [--report-json <path>]
  tsx scripts/migration/cli.ts verify --export-dir <path> --transform-dir <path> [--tolerance <n>] [--report-json <path>]
  tsx scripts/migration/cli.ts rewrite-urls --transform-dir <path> --from-prefix <urlPrefix> --to-prefix <urlPrefix> [--out-dir <path>]

Environment:
  Export: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or LEGACY_*)
  Import/verify: DATABASE_URL
  Optional: MIGRATION_ALLOW_REIMPORT=1 to bypass one-time audit marker
  Bootstrap: BOOTSTRAP_SUPER_ADMIN_EMAIL / NAME (see runbook)

See docs/runbook-production-migration.md for ordering and rollback notes.
`);
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  if (!cmd || cmd === "help" || cmd === "-h" || cmd === "--help") {
    printHelp();
    process.exit(0);
  }

  const reportJson = argValue("--report-json", argv);
  const report = new MigrationReport();

  try {
    if (cmd === "export") {
      const outDir = argValue("--out-dir", argv);
      if (!outDir) throw new Error("export requires --out-dir");
      await runSupabaseExport({ outDir, report });
    } else if (cmd === "transform") {
      const exportDir = argValue("--export-dir", argv);
      const outDir = argValue("--out-dir", argv);
      if (!exportDir || !outDir) throw new Error("transform requires --export-dir and --out-dir");
      await runTransform({
        exportDir,
        outDir,
        report,
        clerkExportPath: argValue("--clerk-export", argv),
        identityMapPath: argValue("--identity-map", argv),
      });
    } else if (cmd === "import") {
      const transformDir = argValue("--transform-dir", argv);
      if (!transformDir) throw new Error("import requires --transform-dir");
      await runPrismaImport({
        transformDir,
        dryRun: hasFlag("--dry-run", argv),
        report,
      });
    } else if (cmd === "verify") {
      const exportDir = argValue("--export-dir", argv);
      const transformDir = argValue("--transform-dir", argv);
      if (!exportDir || !transformDir) throw new Error("verify requires --export-dir and --transform-dir");
      const tolRaw = argValue("--tolerance", argv);
      const tolerance = tolRaw ? Number(tolRaw) : 0.01;
      const code = await runVerify({ exportDir, transformDir, tolerance, report });
      report.writeJson(reportJson, { ...report.summaryPayload(), exitCode: code });
      process.exit(code);
    } else if (cmd === "rewrite-urls") {
      const transformDir = argValue("--transform-dir", argv);
      const fromPrefix = argValue("--from-prefix", argv);
      const toPrefix = argValue("--to-prefix", argv);
      if (!transformDir || !fromPrefix || !toPrefix) {
        throw new Error("rewrite-urls requires --transform-dir, --from-prefix, --to-prefix");
      }
      runUrlRewrite({
        transformDir,
        outDir: argValue("--out-dir", argv),
        fromPrefix,
        toPrefix,
        report,
      });
    } else {
      throw new Error(`Unknown command: ${cmd}`);
    }

    report.writeJson(reportJson, report.summaryPayload());
    process.exit(0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    report.log("error", msg);
    report.writeJson(reportJson, { ...report.summaryPayload(), fatal: msg });
    process.exit(1);
  }
}

void main();
