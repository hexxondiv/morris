import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { legacyProfileIdToUserId } from "./uuidv5";
import type { MigrationReport } from "./report";
import type {
  LegacyProfile,
  LegacyProject,
  LegacyPledge,
  LegacyTransaction,
  LegacyVote,
  LegacyVotingPeriod,
  LegacySetting,
  ClerkExportUser,
} from "./types-legacy";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function num(n: number | string | null | undefined): number {
  if (n === null || n === undefined) return 0;
  return typeof n === "number" ? n : Number(n);
}

function decStr(n: number | string): string {
  const v = num(n);
  if (!Number.isFinite(v)) return "0";
  return v.toFixed(4);
}

export type IdentityMapFile = {
  /** Force `users.id` for a legacy `profiles.id` (Clerk user id). Must be 36-char UUID. */
  userIdByLegacyProfileId?: Record<string, string>;
  /** Force `users.id` for a normalized email (lowercase). */
  userIdByEmail?: Record<string, string>;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function resolveUserId(
  legacyProfileId: string,
  email: string,
  identityMap: IdentityMapFile | null,
  report: MigrationReport
): { userId: string; source: "deterministic" | "override_profile" | "override_email" } {
  const e = normalizeEmail(email);
  if (identityMap?.userIdByLegacyProfileId?.[legacyProfileId]) {
    report.log("info", `Identity override by legacy profile id for ${legacyProfileId}`);
    return { userId: identityMap.userIdByLegacyProfileId[legacyProfileId]!, source: "override_profile" };
  }
  if (identityMap?.userIdByEmail?.[e]) {
    report.log("info", `Identity override by email for ${e}`);
    return { userId: identityMap.userIdByEmail[e]!, source: "override_email" };
  }
  return { userId: legacyProfileIdToUserId(legacyProfileId), source: "deterministic" };
}

function mapProjectStatus(s: string): string {
  const k = s.toLowerCase();
  const allowed = new Set([
    "draft",
    "proposed",
    "voting",
    "active",
    "completed",
    "cancelled",
    "archived",
  ]);
  if (allowed.has(k)) return k.toUpperCase();
  return "DRAFT";
}

function mapPledgeType(t: string): string {
  const k = t.toLowerCase();
  if (k === "one_time" || k === "one-time") return "ONE_TIME";
  if (k === "recurring") return "RECURRING";
  return "ONE_TIME";
}

function mapPledgeInterval(i: string | null | undefined): string | null {
  if (!i) return null;
  const k = i.toLowerCase();
  if (k === "monthly") return "MONTHLY";
  if (k === "quarterly") return "QUARTERLY";
  if (k === "yearly") return "YEARLY";
  return null;
}

function mapPaymentDay(d: string | null | undefined): string | null {
  if (!d) return null;
  const k = d.toLowerCase();
  if (k === "today") return "TODAY";
  if (k === "1st" || k === "first") return "FIRST";
  if (k === "28th" || k === "twenty_eighth") return "TWENTY_EIGHTH";
  return null;
}

function mapPledgeStatus(s: string): string {
  const k = s.toLowerCase();
  const m: Record<string, string> = {
    pending: "PENDING",
    active: "ACTIVE",
    completed: "COMPLETED",
    failed: "FAILED",
    cancelled: "CANCELLED",
  };
  return m[k] ?? "PENDING";
}

function mapTxKind(paymentType: string): string {
  const k = paymentType.toLowerCase();
  if (k === "pledge") return "PLEDGE";
  if (k === "donation") return "DONATION";
  if (k === "subscription") return "PLEDGE";
  return "DONATION";
}

function mapTxStatus(s: string): string {
  const k = s.toLowerCase();
  const m: Record<string, string> = {
    pending: "PENDING",
    completed: "COMPLETED",
    failed: "FAILED",
    refunded: "REFUNDED",
    cancelled: "CANCELLED",
  };
  return m[k] ?? "PENDING";
}

export type TransformOptions = {
  exportDir: string;
  outDir: string;
  report: MigrationReport;
  clerkExportPath?: string;
  identityMapPath?: string;
};

export async function runTransform(opts: TransformOptions): Promise<void> {
  const { exportDir, outDir, report } = opts;
  mkdirSync(outDir, { recursive: true });

  const profiles = readJson<LegacyProfile[]>(join(exportDir, "profiles.json"));
  const projects = readJson<LegacyProject[]>(join(exportDir, "projects.json"));
  const pledges = readJson<LegacyPledge[]>(join(exportDir, "pledges.json"));
  const transactions = readJson<LegacyTransaction[]>(join(exportDir, "transactions.json"));
  const votes = readJson<LegacyVote[]>(join(exportDir, "votes.json"));
  const votingPeriods = readJson<LegacyVotingPeriod[]>(join(exportDir, "voting_periods.json"));
  const settings = readJson<LegacySetting[]>(join(exportDir, "settings.json"));
  let timelinesRaw: Record<string, unknown>[] = [];
  try {
    timelinesRaw = readJson<Record<string, unknown>[]>(join(exportDir, "project_timelines.json"));
  } catch {
    timelinesRaw = [];
  }

  let identityMap: IdentityMapFile | null = null;
  if (opts.identityMapPath) {
    identityMap = readJson<IdentityMapFile>(opts.identityMapPath);
    report.log("info", `Loaded identity map: ${opts.identityMapPath}`);
  }

  let clerkUsers: ClerkExportUser[] = [];
  if (opts.clerkExportPath) {
    clerkUsers = readJson<ClerkExportUser[]>(opts.clerkExportPath);
    report.log("info", `Loaded Clerk export users: ${clerkUsers.length}`);
  }

  const clerkById = new Map(clerkUsers.map((u) => [u.id, u]));

  /** legacy profile id -> chosen user id */
  const profileIdToUserId = new Map<string, string>();
  /** email -> legacy profile ids (detect ambiguity) */
  const emailToProfileIds = new Map<string, string[]>();

  for (const p of profiles) {
    const em = normalizeEmail(p.email);
    const list = emailToProfileIds.get(em) ?? [];
    list.push(p.id);
    emailToProfileIds.set(em, list);
  }

  for (const [em, ids] of Array.from(emailToProfileIds.entries())) {
    if (ids.length > 1) {
      report.ambiguity(`Multiple legacy profiles share email "${em}": ${ids.join(", ")} — requires identity-map or manual dedupe.`);
    }
  }

  const transformedUsers: Array<{
    id: string;
    email: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    legacyProfileId: string;
    legacyRole: string | null;
  }> = [];

  const emittedEmails = new Set<string>();

  for (const p of profiles) {
    const clerk = clerkById.get(p.id);
    if (clerk) {
      const primary =
        clerk.primary_email_address ??
        clerk.email_addresses?.[0]?.email_address ??
        null;
      if (primary && normalizeEmail(primary) !== normalizeEmail(p.email)) {
        report.ambiguity(
          `Clerk primary email differs from Supabase profile email for id=${p.id} (clerk=${primary} profile=${p.email}). Skipping user row until resolved.`
        );
        continue;
      }
    }

    const { userId } = resolveUserId(p.id, p.email, identityMap, report);
    const emNorm = normalizeEmail(p.email);
    if (emittedEmails.has(emNorm)) {
      report.ambiguity(
        `Duplicate email in legacy profiles after Clerk checks: email=${emNorm} profile_id=${p.id} — skipping duplicate user row; fix source data or use identity-map.`
      );
      continue;
    }
    emittedEmails.add(emNorm);

    profileIdToUserId.set(p.id, userId);

    const displayName =
      [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || null;

    transformedUsers.push({
      id: userId,
      email: normalizeEmail(p.email),
      displayName,
      firstName: p.first_name ?? null,
      lastName: p.last_name ?? null,
      avatarUrl: p.avatar_url ?? null,
      legacyProfileId: p.id,
      legacyRole: p.role ?? "user",
    });
  }

  const transformedProjects = projects.map((pr) => ({
    id: pr.id,
    creatorId: profileIdToUserId.get(pr.creator_id) ?? null,
    legacyCreatorProfileId: pr.creator_id,
    slug: pr.slug,
    title: pr.title,
    description: pr.description,
    bodyHtml: pr.body_html ?? null,
    goalAmount: decStr(pr.goal_amount),
    currentAmount: decStr(pr.current_amount ?? 0),
    currency: "NGN",
    status: mapProjectStatus(pr.status),
    sector: pr.sector ?? null,
    country: pr.country ?? null,
    state: pr.state ?? null,
    coverImageUrl: pr.cover_image ?? null,
    featuredRank: null as number | null,
    publishedAt: null as string | null,
    completedAt: null as string | null,
    cancelledAt: null as string | null,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
  }));

  for (const p of transformedProjects) {
    if (!p.creatorId) {
      report.ambiguity(
        `Project ${p.id} (${p.slug}) references unknown creator legacy id ${p.legacyCreatorProfileId} — import will skip or fail FK unless identity-map supplies mapping.`
      );
    }
  }

  const transformedPledges = pledges.map((pl) => ({
    id: pl.id,
    userId: profileIdToUserId.get(pl.user_id) ?? null,
    legacyUserProfileId: pl.user_id,
    projectId: pl.project_id ?? null,
    amount: decStr(pl.amount),
    currency: "NGN",
    pledgeType: mapPledgeType(pl.pledge_type),
    recurrenceInterval: mapPledgeInterval(pl.recurrence_interval),
    paymentDay: mapPaymentDay(pl.payment_day),
    status: mapPledgeStatus(pl.status),
    donorEmail: null as string | null,
    donorName: null as string | null,
    startedAt: null as string | null,
    completedAt: null as string | null,
    cancelledAt: null as string | null,
    createdAt: pl.created_at ?? new Date().toISOString(),
    updatedAt: pl.updated_at ?? new Date().toISOString(),
  }));

  const transformedTransactions = transactions.map((t) => {
    const meta = (t.metadata ?? {}) as Record<string, unknown>;
    const projectFromMeta =
      typeof meta.projectId === "string"
        ? meta.projectId
        : typeof meta.project_id === "string"
          ? meta.project_id
          : null;
    const metaUser =
      typeof meta.userId === "string"
        ? meta.userId
        : typeof meta.user_id === "string"
          ? meta.user_id
          : null;
    const legacyUser = metaUser && metaUser !== t.user_id ? metaUser : t.user_id;
    return {
      id: t.id,
      userId: profileIdToUserId.get(t.user_id) ?? profileIdToUserId.get(legacyUser) ?? null,
      legacyUserProfileId: t.user_id,
      pledgeId: t.pledge_id ?? null,
      projectId: projectFromMeta,
      projectStageId: null as string | null,
      ledgerAccountId: null as string | null,
      direction: "CREDIT",
      kind: mapTxKind(t.payment_type),
      amount: decStr(t.amount),
      currency: (t.currency ?? "NGN").slice(0, 3),
      status: mapTxStatus(t.payment_status),
      paymentMethod: t.payment_method ?? null,
      paymentProcessor: null as string | null,
      paymentReference: t.payment_ref ?? null,
      externalReference: null as string | null,
      description: null as string | null,
      metadata: t.metadata ?? null,
      paidAt: t.paid_at,
      postedAt: t.paid_at ?? t.created_at,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    };
  });

  const transformedVotes = votes.map((v) => ({
    id: v.id,
    userId: profileIdToUserId.get(v.user_id) ?? null,
    legacyUserProfileId: v.user_id,
    projectId: v.project_id,
    choice: v.vote ? "SUPPORT" : "OPPOSE",
    eligiblePledgeAmount: null as string | null,
    createdAt: v.created_at ?? new Date().toISOString(),
    updatedAt: v.created_at ?? new Date().toISOString(),
  }));

  const transformedVotingPeriods = votingPeriods.map((vp) => ({
    id: vp.id,
    projectId: vp.project_id,
    startAt: vp.start_date,
    endAt: vp.end_date,
    createdAt: vp.created_at ?? new Date().toISOString(),
    updatedAt: vp.created_at ?? new Date().toISOString(),
  }));

  const transformedSettings = settings.map((s) => {
    let parsed: unknown = s.value;
    try {
      parsed = JSON.parse(s.value) as unknown;
    } catch {
      parsed = s.value;
    }
    return {
      legacyId: s.id,
      key: s.key,
      displayName: s.key,
      description: s.description ?? null,
      category: "legacy_import",
      subcategory: null as string | null,
      value: parsed,
      defaultValue: parsed,
      dataType: typeof parsed === "object" && parsed !== null ? "JSON" : "STRING",
      validationRules: null as null,
      accessLevel: "PROTECTED",
      cacheStrategy: "DYNAMIC",
      cacheTtlSeconds: 300,
      isEncrypted: false,
      isActive: true,
      sortOrder: 0,
      createdById: null as string | null,
      updatedById: null as string | null,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    };
  });

  const completedTxSum = transactions
    .filter((t) => t.payment_status?.toLowerCase() === "completed")
    .reduce((acc, t) => acc + num(t.amount), 0);
  const pledgeSum = pledges.reduce((acc, p) => acc + num(p.amount), 0);
  const projectCurrentSum = projects.reduce((acc, p) => acc + num(p.current_amount), 0);

  const identityExport = Object.fromEntries(profileIdToUserId.entries());

  writeFileSync(join(outDir, "users.json"), JSON.stringify(transformedUsers, null, 2), "utf8");
  writeFileSync(join(outDir, "projects.json"), JSON.stringify(transformedProjects, null, 2), "utf8");
  writeFileSync(join(outDir, "pledges.json"), JSON.stringify(transformedPledges, null, 2), "utf8");
  writeFileSync(join(outDir, "transactions.json"), JSON.stringify(transformedTransactions, null, 2), "utf8");
  writeFileSync(join(outDir, "votes.json"), JSON.stringify(transformedVotes, null, 2), "utf8");
  writeFileSync(join(outDir, "voting_periods.json"), JSON.stringify(transformedVotingPeriods, null, 2), "utf8");
  writeFileSync(join(outDir, "settings.json"), JSON.stringify(transformedSettings, null, 2), "utf8");
  writeFileSync(join(outDir, "project_timelines_raw.json"), JSON.stringify(timelinesRaw, null, 2), "utf8");
  writeFileSync(join(outDir, "identity_map.json"), JSON.stringify(identityExport, null, 2), "utf8");

  const manifest = {
    transformedAt: new Date().toISOString(),
    counts: {
      users: transformedUsers.length,
      profiles_input: profiles.length,
      projects: transformedProjects.length,
      pledges: transformedPledges.length,
      transactions: transformedTransactions.length,
      votes: transformedVotes.length,
      voting_periods: transformedVotingPeriods.length,
      settings: transformedSettings.length,
      project_timelines_raw: timelinesRaw.length,
    },
    financials_legacy_export: {
      sum_pledge_amount_all_statuses: pledgeSum,
      sum_transaction_amount_completed_only: completedTxSum,
      sum_project_current_amount: projectCurrentSum,
    },
    notes: [
      "User ids for legacy Clerk profile ids use deterministic UUIDv5 (see scripts/migration/uuidv5.ts).",
      "Cases / case_files are deferred unless present in export JSON; use follow-up import or manual tooling.",
      "Project timelines: if legacy `project_timelines` rows are missing, import creates ACTIVE v1 timelines without stages.",
    ],
  };
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  report.log("info", `Transform complete → ${outDir}`);
}
