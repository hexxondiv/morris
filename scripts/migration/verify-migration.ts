import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db/prisma";
import type { MigrationReport } from "./report";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export type VerifyOptions = {
  exportDir: string;
  transformDir: string;
  tolerance: number;
  report: MigrationReport;
};

type Manifest = {
  counts: Record<string, number>;
  financials_legacy_export: {
    sum_pledge_amount_all_statuses: number;
    sum_transaction_amount_completed_only: number;
    sum_project_current_amount: number;
  };
};

async function countIdsPresent(table: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const chunkSize = 400;
  let total = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => "?").join(",");
    const rows = await prisma.$queryRawUnsafe<[{ n: bigint }]>(
      `SELECT COUNT(*) AS n FROM \`${table}\` WHERE id IN (${placeholders})`,
      ...chunk
    );
    total += Number(rows[0]?.n ?? 0);
  }
  return total;
}

export async function runVerify(opts: VerifyOptions): Promise<number> {
  const manifest = readJson<Manifest>(join(opts.transformDir, "manifest.json"));

  const userRows = readJson<Array<{ id: string }>>(join(opts.transformDir, "users.json"));
  const projectRows = readJson<Array<{ id: string }>>(join(opts.transformDir, "projects.json"));
  const pledgeRows = readJson<Array<{ id: string }>>(join(opts.transformDir, "pledges.json"));
  const txRows = readJson<Array<{ id: string }>>(join(opts.transformDir, "transactions.json"));
  const voteRows = readJson<Array<{ id: string }>>(join(opts.transformDir, "votes.json"));
  const vpRows = readJson<Array<{ id: string }>>(join(opts.transformDir, "voting_periods.json"));

  const profiles = readJson<unknown[]>(join(opts.exportDir, "profiles.json"));
  const projectsExport = readJson<unknown[]>(join(opts.exportDir, "projects.json"));
  const pledgesExport = readJson<unknown[]>(join(opts.exportDir, "pledges.json"));
  const transactionsExport = readJson<unknown[]>(join(opts.exportDir, "transactions.json"));
  const votesExport = readJson<unknown[]>(join(opts.exportDir, "votes.json"));
  const votingPeriodsExport = readJson<unknown[]>(join(opts.exportDir, "voting_periods.json"));
  const settingsExport = readJson<unknown[]>(join(opts.exportDir, "settings.json"));

  const errors: string[] = [];

  const exportVsTransform: Array<[string, number, number]> = [
    ["profiles → users transform output", profiles.length, userRows.length],
    ["projects", projectsExport.length, projectRows.length],
    ["pledges", pledgesExport.length, pledgeRows.length],
    ["transactions", transactionsExport.length, txRows.length],
    ["votes", votesExport.length, voteRows.length],
    ["voting_periods", votingPeriodsExport.length, vpRows.length],
  ];
  for (const [label, exp, act] of exportVsTransform) {
    if (exp !== act) {
      errors.push(
        `Export vs transform row count mismatch (${label}): export=${exp} transformed=${act} - review transform ambiguities/skips.`
      );
    }
  }

  const uIds = userRows.map((u) => u.id);
  const pIds = projectRows.map((p) => p.id);
  const plIds = pledgeRows.map((p) => p.id);
  const tIds = txRows.map((t) => t.id);
  const vIds = voteRows.map((v) => v.id);
  const vpIds = vpRows.map((v) => v.id);

  const [nU, nP, nPl, nTx, nV, nVp] = await Promise.all([
    countIdsPresent("users", uIds),
    countIdsPresent("projects", pIds),
    countIdsPresent("pledges", plIds),
    countIdsPresent("transactions", tIds),
    countIdsPresent("votes", vIds),
    countIdsPresent("voting_periods", vpIds),
  ]);

  const idChecks: Array<[string, number, number]> = [
    ["users", uIds.length, nU],
    ["projects", pIds.length, nP],
    ["pledges", plIds.length, nPl],
    ["transactions", tIds.length, nTx],
    ["votes", vIds.length, nV],
    ["voting_periods", vpIds.length, nVp],
  ];
  for (const [label, expected, actual] of idChecks) {
    if (expected !== actual) {
      errors.push(`Missing ${label} rows in database: expected ${expected}, found ${actual} by primary id`);
    }
  }

  const badPledgeUsers = await prisma.$queryRaw<[{ n: bigint }]>`
    SELECT COUNT(*) AS n FROM pledges p
    LEFT JOIN users u ON u.id = p.user_id
    WHERE p.user_id IS NOT NULL AND u.id IS NULL
  `;
  const nBadPledge = Number(badPledgeUsers[0]?.n ?? 0);
  if (nBadPledge > 0) {
    errors.push(`FK integrity: ${nBadPledge} pledge(s) reference missing users`);
  }

  const badTxUsers = await prisma.$queryRaw<[{ n: bigint }]>`
    SELECT COUNT(*) AS n FROM transactions t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE t.user_id IS NOT NULL AND u.id IS NULL
  `;
  const nBadTx = Number(badTxUsers[0]?.n ?? 0);
  if (nBadTx > 0) {
    errors.push(`FK integrity: ${nBadTx} transaction(s) reference missing users`);
  }

  const badVotes = await prisma.$queryRaw<[{ n: bigint }]>`
    SELECT COUNT(*) AS n FROM votes v
    LEFT JOIN users u ON u.id = v.user_id
    WHERE u.id IS NULL
  `;
  const nBadVotes = Number(badVotes[0]?.n ?? 0);
  if (nBadVotes > 0) {
    errors.push(`FK integrity: ${nBadVotes} vote(s) reference missing users`);
  }

  const usersWithoutRoles = await prisma.$queryRaw<[{ n: bigint }]>`
    SELECT COUNT(*) AS n FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    WHERE ur.user_id IS NULL
  `;
  const nNoRoles = Number(usersWithoutRoles[0]?.n ?? 0);
  if (nNoRoles > 0) {
    errors.push(`UserRole coverage: ${nNoRoles} user(s) have no role rows`);
  }

  const superAdminRole = await prisma.role.findUnique({ where: { key: "super_admin" } });
  const superAdmins = superAdminRole
    ? await prisma.userRole.count({ where: { roleId: superAdminRole.id } })
    : 0;
  if (superAdmins < 1) {
    errors.push(
      "No super_admin assignments in user_roles. Run `npm run db:seed` then `npm run db:bootstrap-super-admin` (see docs/target-schema-overview.md), or assign manually after import."
    );
  }

  const pledgeSumDb = await prisma.pledge.aggregate({ _sum: { amount: true } });
  const txCompletedSum = await prisma.transaction.aggregate({
    where: { status: "COMPLETED" },
    _sum: { amount: true },
  });
  const projectCurrentSum = await prisma.project.aggregate({ _sum: { currentAmount: true } });

  const expPledge = manifest.financials_legacy_export.sum_pledge_amount_all_statuses;
  const expTx = manifest.financials_legacy_export.sum_transaction_amount_completed_only;
  const expProj = manifest.financials_legacy_export.sum_project_current_amount;

  const gotPledge = Number(pledgeSumDb._sum.amount ?? 0);
  const gotTx = Number(txCompletedSum._sum.amount ?? 0);
  const gotProj = Number(projectCurrentSum._sum.currentAmount ?? 0);

  const tol = opts.tolerance;
  const diff = (a: number, b: number) => Math.abs(a - b);

  if (diff(expPledge, gotPledge) > tol) {
    errors.push(
      `Financial: pledge amount sum mismatch (export manifest ${expPledge} vs DB ${gotPledge}, tolerance ${tol})`
    );
  }
  if (diff(expTx, gotTx) > tol) {
    errors.push(
      `Financial: completed transaction sum mismatch (export ${expTx} vs DB ${gotTx}, tolerance ${tol})`
    );
  }
  if (diff(expProj, gotProj) > tol) {
    errors.push(
      `Financial: project currentAmount sum mismatch (export ${expProj} vs DB ${gotProj}, tolerance ${tol}). Note: totals may diverge if legacy export predates webhook-side increments.`
    );
  }

  const cSettings = await prisma.setting.count();
  if (settingsExport.length > 0 && cSettings < 1) {
    errors.push("Expected settings in database when legacy export contained settings rows.");
  }

  for (const e of errors) opts.report.log("error", e);

  opts.report.log(
    "info",
    errors.length === 0 ? "Verification passed." : `Verification failed with ${errors.length} error(s).`
  );

  return errors.length > 0 ? 1 : 0;
}
