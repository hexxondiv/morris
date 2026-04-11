import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Prisma,
  ProjectStatus,
  PledgeType,
  PledgeStatus,
  PledgeInterval,
  PaymentDay,
  TransactionDirection,
  TransactionKind,
  TransactionStatus,
  VoteChoice,
  TimelineStatus,
  SettingDataType,
  SettingAccessLevel,
  SettingCacheStrategy,
  UserStatus,
  UserOnboardingState,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { MigrationReport } from "./report";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function parseEnum<E extends string>(allowed: readonly E[], raw: string, fallback: E): E {
  const u = raw.toUpperCase() as E;
  return (allowed as readonly string[]).includes(u) ? u : fallback;
}

const PROJECT_STATUSES = Object.values(ProjectStatus);
const PLEDGE_TYPES = Object.values(PledgeType);
const PLEDGE_STATUSES = Object.values(PledgeStatus);
const PLEDGE_INTERVALS = Object.values(PledgeInterval);
const PAYMENT_DAYS = Object.values(PaymentDay);
const TX_KINDS = Object.values(TransactionKind);
const TX_STATUSES = Object.values(TransactionStatus);
const VOTE_CHOICES = Object.values(VoteChoice);
const SETTING_DATA_TYPES = Object.values(SettingDataType);

export type ImportOptions = {
  transformDir: string;
  dryRun: boolean;
  report: MigrationReport;
};

export async function runPrismaImport(opts: ImportOptions): Promise<void> {
  const { transformDir, dryRun, report } = opts;

  const users = readJson<
    Array<{
      id: string;
      email: string;
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
      legacyProfileId: string;
      legacyRole: string | null;
    }>
  >(join(transformDir, "users.json"));

  const projectsIn = readJson<
    Array<{
      id: string;
      creatorId: string | null;
      slug: string;
      title: string;
      description: string;
      bodyHtml: string | null;
      goalAmount: string;
      currentAmount: string;
      currency: string;
      status: string;
      sector: string | null;
      country: string | null;
      state: string | null;
      coverImageUrl: string | null;
      featuredRank: number | null;
      publishedAt: string | null;
      completedAt: string | null;
      cancelledAt: string | null;
      createdAt: string;
      updatedAt: string;
    }>
  >(join(transformDir, "projects.json"));

  const pledgesIn = readJson<
    Array<{
      id: string;
      userId: string | null;
      projectId: string | null;
      amount: string;
      currency: string;
      pledgeType: string;
      recurrenceInterval: string | null;
      paymentDay: string | null;
      status: string;
      donorEmail: string | null;
      donorName: string | null;
      startedAt: string | null;
      completedAt: string | null;
      cancelledAt: string | null;
      createdAt: string;
      updatedAt: string;
    }>
  >(join(transformDir, "pledges.json"));

  const transactionsIn = readJson<
    Array<{
      id: string;
      userId: string | null;
      pledgeId: string | null;
      projectId: string | null;
      projectStageId: string | null;
      ledgerAccountId: string | null;
      direction: string;
      kind: string;
      amount: string;
      currency: string;
      status: string;
      paymentMethod: string | null;
      paymentProcessor: string | null;
      paymentReference: string | null;
      externalReference: string | null;
      description: string | null;
      metadata: unknown;
      paidAt: string | null;
      postedAt: string | null;
      createdAt: string;
      updatedAt: string;
    }>
  >(join(transformDir, "transactions.json"));

  const votesIn = readJson<
    Array<{
      id: string;
      userId: string | null;
      projectId: string;
      choice: string;
      eligiblePledgeAmount: string | null;
      createdAt: string;
      updatedAt: string;
    }>
  >(join(transformDir, "votes.json"));

  const votingPeriodsIn = readJson<
    Array<{
      id: string;
      projectId: string;
      startAt: string;
      endAt: string;
      createdAt: string;
      updatedAt: string;
    }>
  >(join(transformDir, "voting_periods.json"));

  const settingsIn = readJson<
    Array<{
      legacyId: string;
      key: string;
      displayName: string;
      description: string | null;
      category: string;
      subcategory: string | null;
      value: unknown;
      defaultValue: unknown;
      dataType: string;
      validationRules: null;
      accessLevel: string;
      cacheStrategy: string;
      cacheTtlSeconds: number;
      isEncrypted: boolean;
      isActive: boolean;
      sortOrder: number;
      createdById: string | null;
      updatedById: string | null;
      createdAt: string;
      updatedAt: string;
    }>
  >(join(transformDir, "settings.json"));

  if (dryRun) {
    report.log("info", "[dry-run] No database writes. Payload summary:", {
      users: users.length,
      projects: projectsIn.length,
      pledges: pledgesIn.length,
      transactions: transactionsIn.length,
      votes: votesIn.length,
      voting_periods: votingPeriodsIn.length,
      settings: settingsIn.length,
    });
    report.batch({
      batch: "dry_run_summary",
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    });
    return;
  }

  const marker = await prisma.auditLog.findFirst({
    where: { entityType: "migration", action: "legacy_import_completed" },
    select: { id: true },
  });
  const allowReimport = process.env.MIGRATION_ALLOW_REIMPORT === "1";
  if (marker && !allowReimport) {
    report.log(
      "warn",
      "Target database already contains audit marker migration/legacy_import_completed. Refusing import. Set MIGRATION_ALLOW_REIMPORT=1 after intentional cleanup, or remove the audit row."
    );
    throw new Error("Import already completed (audit marker present).");
  }
  if (marker && allowReimport) {
    report.log("warn", "MIGRATION_ALLOW_REIMPORT=1: proceeding despite prior legacy_import_completed marker.");
  }

  const roleRows = await prisma.role.findMany({ select: { id: true, key: true } });
  const roleIdByKey = new Map(roleRows.map((r) => [r.key, r.id]));

  const mapLegacyRoleKey = (r: string | null): string => {
    const k = (r ?? "user").toLowerCase();
    if (k === "super_admin") return "super_admin";
    if (k === "admin") return "admin";
    if (k === "moderator") return "moderator";
    if (k === "editor") return "editor";
    return "user";
  };

  const userErrors: string[] = [];
  let usersInserted = 0;
  let usersUpdated = 0;
  let usersSkipped = 0;

  for (const u of users) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: u.email },
      select: { id: true },
    });
    if (existingByEmail && existingByEmail.id !== u.id) {
      userErrors.push(
        `User email collision: ${u.email} already owned by id=${existingByEmail.id}, migration wants id=${u.id}. Use identity-map or resolve manually.`
      );
      usersSkipped++;
      continue;
    }

    const existingById = await prisma.user.findUnique({
      where: { id: u.id },
      select: { id: true },
    });

    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl,
        status: UserStatus.ACTIVE,
        onboardingState: UserOnboardingState.COMPLETE,
      },
      update: {
        displayName: u.displayName,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl,
      },
    });
    if (existingById) usersUpdated++;
    else usersInserted++;

    await prisma.profile.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id },
    });

    const rk = mapLegacyRoleKey(u.legacyRole);
    const roleId = roleIdByKey.get(rk);
    if (!roleId) {
      userErrors.push(`Missing role key ${rk} for user ${u.email}`);
      continue;
    }
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: u.id, roleId } },
      update: {},
      create: { userId: u.id, roleId, assignedBy: u.id },
    });
  }

  report.batch({
    batch: "users_profiles_roles",
    inserted: usersInserted,
    updated: usersUpdated,
    skipped: usersSkipped,
    errors: userErrors,
  });

  const projectErrors: string[] = [];
  let pIns = 0,
    pSkip = 0;

  for (const p of projectsIn) {
    if (!p.creatorId) {
      projectErrors.push(`Skip project ${p.id}: missing mapped creator`);
      pSkip++;
      continue;
    }
    await prisma.project.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        creatorId: p.creatorId,
        slug: p.slug,
        title: p.title,
        description: p.description,
        bodyHtml: p.bodyHtml,
        goalAmount: new Prisma.Decimal(p.goalAmount),
        currentAmount: new Prisma.Decimal(p.currentAmount),
        currency: p.currency.slice(0, 3),
        status: parseEnum(PROJECT_STATUSES, p.status, ProjectStatus.DRAFT),
        sector: p.sector,
        country: p.country,
        state: p.state,
        coverImageUrl: p.coverImageUrl,
        featuredRank: p.featuredRank,
        publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
        completedAt: p.completedAt ? new Date(p.completedAt) : null,
        cancelledAt: p.cancelledAt ? new Date(p.cancelledAt) : null,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      },
      update: {
        title: p.title,
        description: p.description,
        bodyHtml: p.bodyHtml,
        goalAmount: new Prisma.Decimal(p.goalAmount),
        currentAmount: new Prisma.Decimal(p.currentAmount),
        status: parseEnum(PROJECT_STATUSES, p.status, ProjectStatus.DRAFT),
        coverImageUrl: p.coverImageUrl,
        updatedAt: new Date(p.updatedAt),
      },
    });
    pIns++;
  }

  report.batch({
    batch: "projects",
    inserted: pIns,
    updated: 0,
    skipped: pSkip,
    errors: projectErrors,
  });

  /** Default timelines for projects missing one */
  const timelineErrors: string[] = [];
  let tIns = 0;
  const projectIds = new Set(projectsIn.map((p) => p.id));
  for (const pid of Array.from(projectIds)) {
    const exists = await prisma.projectTimeline.findUnique({
      where: { projectId: pid },
      select: { id: true },
    });
    if (exists) continue;
    const proj = await prisma.project.findUnique({
      where: { id: pid },
      select: { creatorId: true },
    });
    if (!proj) {
      timelineErrors.push(`No project row for timeline bootstrap: ${pid}`);
      continue;
    }
    await prisma.projectTimeline.create({
      data: {
        projectId: pid,
        version: 1,
        status: TimelineStatus.ACTIVE,
        createdById: proj.creatorId,
      },
    });
    tIns++;
  }
  report.batch({
    batch: "project_timelines_default",
    inserted: tIns,
    updated: 0,
    skipped: 0,
    errors: timelineErrors,
  });

  const vpErrors: string[] = [];
  let vpIns = 0;
  for (const vp of votingPeriodsIn) {
    await prisma.votingPeriod.upsert({
      where: { projectId: vp.projectId },
      create: {
        id: vp.id,
        projectId: vp.projectId,
        startAt: new Date(vp.startAt),
        endAt: new Date(vp.endAt),
        createdAt: new Date(vp.createdAt),
        updatedAt: new Date(vp.updatedAt),
      },
      update: {
        startAt: new Date(vp.startAt),
        endAt: new Date(vp.endAt),
        updatedAt: new Date(vp.updatedAt),
      },
    });
    vpIns++;
  }
  report.batch({
    batch: "voting_periods",
    inserted: vpIns,
    updated: 0,
    skipped: 0,
    errors: vpErrors,
  });

  const plErrors: string[] = [];
  let plIns = 0,
    plSkip = 0;
  for (const pl of pledgesIn) {
    if (!pl.userId) {
      plErrors.push(`Skip pledge ${pl.id}: unmapped user`);
      plSkip++;
      continue;
    }
    await prisma.pledge.upsert({
      where: { id: pl.id },
      create: {
        id: pl.id,
        userId: pl.userId,
        projectId: pl.projectId,
        amount: new Prisma.Decimal(pl.amount),
        currency: pl.currency.slice(0, 3),
        pledgeType: parseEnum(PLEDGE_TYPES, pl.pledgeType, PledgeType.ONE_TIME),
        recurrenceInterval: pl.recurrenceInterval
          ? parseEnum(PLEDGE_INTERVALS, pl.recurrenceInterval, PledgeInterval.MONTHLY)
          : null,
        paymentDay: pl.paymentDay ? parseEnum(PAYMENT_DAYS, pl.paymentDay, PaymentDay.TODAY) : null,
        status: parseEnum(PLEDGE_STATUSES, pl.status, PledgeStatus.PENDING),
        donorEmail: pl.donorEmail,
        donorName: pl.donorName,
        startedAt: pl.startedAt ? new Date(pl.startedAt) : null,
        completedAt: pl.completedAt ? new Date(pl.completedAt) : null,
        cancelledAt: pl.cancelledAt ? new Date(pl.cancelledAt) : null,
        createdAt: new Date(pl.createdAt),
        updatedAt: new Date(pl.updatedAt),
      },
      update: {
        amount: new Prisma.Decimal(pl.amount),
        status: parseEnum(PLEDGE_STATUSES, pl.status, PledgeStatus.PENDING),
        updatedAt: new Date(pl.updatedAt),
      },
    });
    plIns++;
  }
  report.batch({
    batch: "pledges",
    inserted: plIns,
    updated: 0,
    skipped: plSkip,
    errors: plErrors,
  });

  const txErrors: string[] = [];
  let txIns = 0,
    txSkip = 0;
  for (const t of transactionsIn) {
    if (!t.userId) {
      txErrors.push(`Skip transaction ${t.id}: unmapped user`);
      txSkip++;
      continue;
    }
    const data = {
      id: t.id,
      userId: t.userId,
      pledgeId: t.pledgeId,
      projectId: t.projectId,
      projectStageId: t.projectStageId,
      ledgerAccountId: t.ledgerAccountId,
      direction: TransactionDirection.CREDIT,
      kind: parseEnum(TX_KINDS, t.kind, TransactionKind.DONATION),
      amount: new Prisma.Decimal(t.amount),
      currency: t.currency.slice(0, 3),
      status: parseEnum(TX_STATUSES, t.status, TransactionStatus.PENDING),
      paymentMethod: t.paymentMethod,
      paymentProcessor: t.paymentProcessor,
      paymentReference: t.paymentReference,
      externalReference: t.externalReference,
      description: t.description,
      metadata: t.metadata === null ? Prisma.JsonNull : (t.metadata as Prisma.InputJsonValue),
      paidAt: t.paidAt ? new Date(t.paidAt) : null,
      postedAt: t.postedAt ? new Date(t.postedAt) : null,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    };
    try {
      await prisma.transaction.upsert({
        where: { id: t.id },
        create: data,
        update: {
          status: data.status,
          paidAt: data.paidAt,
          postedAt: data.postedAt,
          metadata: data.metadata,
          updatedAt: data.updatedAt,
        },
      });
      txIns++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      txErrors.push(`Transaction ${t.id}: ${msg}`);
      txSkip++;
    }
  }
  report.batch({
    batch: "transactions",
    inserted: txIns,
    updated: 0,
    skipped: txSkip,
    errors: txErrors,
  });

  const vErrors: string[] = [];
  let vIns = 0,
    vSkip = 0;
  for (const v of votesIn) {
    if (!v.userId) {
      vErrors.push(`Skip vote ${v.id}: unmapped user`);
      vSkip++;
      continue;
    }
    await prisma.vote.upsert({
      where: { userId_projectId: { userId: v.userId, projectId: v.projectId } },
      create: {
        id: v.id,
        userId: v.userId,
        projectId: v.projectId,
        choice: parseEnum(VOTE_CHOICES, v.choice, VoteChoice.SUPPORT),
        eligiblePledgeAmount: v.eligiblePledgeAmount
          ? new Prisma.Decimal(v.eligiblePledgeAmount)
          : null,
        createdAt: new Date(v.createdAt),
        updatedAt: new Date(v.updatedAt),
      },
      update: {
        choice: parseEnum(VOTE_CHOICES, v.choice, VoteChoice.SUPPORT),
        updatedAt: new Date(v.updatedAt),
      },
    });
    vIns++;
  }
  report.batch({
    batch: "votes",
    inserted: vIns,
    updated: 0,
    skipped: vSkip,
    errors: vErrors,
  });

  const sErrors: string[] = [];
  let sIns = 0;
  for (const s of settingsIn) {
    const dt = parseEnum(SETTING_DATA_TYPES, s.dataType, SettingDataType.STRING);
    await prisma.setting.upsert({
      where: { key: s.key },
      create: {
        key: s.key,
        displayName: s.displayName,
        description: s.description,
        category: s.category,
        subcategory: s.subcategory,
        value: s.value as Prisma.InputJsonValue,
        defaultValue: (s.defaultValue ?? s.value) as Prisma.InputJsonValue,
        dataType: dt,
        validationRules: Prisma.JsonNull,
        accessLevel: SettingAccessLevel.PROTECTED,
        cacheStrategy: SettingCacheStrategy.DYNAMIC,
        cacheTtlSeconds: s.cacheTtlSeconds,
        isEncrypted: s.isEncrypted,
        isActive: s.isActive,
        sortOrder: s.sortOrder,
        createdById: s.createdById,
        updatedById: s.updatedById,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      },
      update: {
        value: s.value as Prisma.InputJsonValue,
        updatedAt: new Date(s.updatedAt),
      },
    });
    sIns++;
  }
  report.batch({
    batch: "settings",
    inserted: sIns,
    updated: 0,
    skipped: 0,
    errors: sErrors,
  });

  await prisma.auditLog.create({
    data: {
      actorType: "JOB",
      entityType: "migration",
      entityId: "legacy",
      action: "legacy_import_completed",
      summary: "Legacy Supabase → Prisma import batch finished",
      metadata: { transformDir } as Prisma.InputJsonValue,
    },
  });

  report.log("info", "Import finished.");
}
