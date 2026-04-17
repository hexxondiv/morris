import {
  PrismaClient,
  Prisma,
  AuditActorType,
  EventStatus,
  EventType,
  LedgerAccountCategory,
  SettingAccessLevel,
  SettingCacheStrategy,
  SettingDataType,
  UserOnboardingState,
  UserStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const permissionCatalog = [
  ["users.read", "users", "read"],
  ["users.manage", "users", "manage"],
  ["roles.manage", "roles", "manage"],
  ["projects.read", "projects", "read"],
  ["projects.manage", "projects", "manage"],
  ["timelines.manage", "timelines", "manage"],
  ["pledges.read", "pledges", "read"],
  ["pledges.manage", "pledges", "manage"],
  ["transactions.read", "transactions", "read"],
  ["transactions.manage", "transactions", "manage"],
  ["votes.read", "votes", "read"],
  ["votes.cast", "votes", "cast"],
  ["cases.read", "cases", "read"],
  ["cases.review", "cases", "review"],
  ["settings.read", "settings", "read"],
  ["settings.manage", "settings", "manage"],
  ["events.read", "events", "read"],
  ["events.manage", "events", "manage"],
  ["audit_logs.read", "audit_logs", "read"],
] as const;

const roleCatalog = [
  {
    key: "super_admin",
    name: "Super Admin",
    description: "Full platform control, bootstrap-safe owner role.",
    sortOrder: 1,
    permissionKeys: permissionCatalog.map(([key]) => key),
  },
  {
    key: "admin",
    name: "Admin",
    description: "Operational administration across platform surfaces.",
    sortOrder: 10,
    permissionKeys: [
      "users.read",
      "projects.read",
      "projects.manage",
      "timelines.manage",
      "pledges.read",
      "pledges.manage",
      "transactions.read",
      "transactions.manage",
      "votes.read",
      "cases.read",
      "cases.review",
      "settings.read",
      "settings.manage",
      "events.read",
      "events.manage",
      "audit_logs.read",
    ],
  },
  {
    key: "moderator",
    name: "Moderator",
    description: "Project, case, and event moderation.",
    sortOrder: 20,
    permissionKeys: [
      "projects.read",
      "projects.manage",
      "timelines.manage",
      "pledges.read",
      "transactions.read",
      "votes.read",
      "cases.read",
      "cases.review",
      "events.read",
      "events.manage",
      "settings.read",
    ],
  },
  {
    key: "editor",
    name: "Editor",
    description: "Content and project authoring for admin surfaces.",
    sortOrder: 30,
    permissionKeys: [
      "projects.read",
      "projects.manage",
      "timelines.manage",
      "events.read",
      "events.manage",
      "settings.read",
    ],
  },
  {
    key: "user",
    name: "User",
    description: "Default signed-in member role.",
    sortOrder: 100,
    permissionKeys: [
      "projects.read",
      "pledges.read",
      "votes.cast",
      "events.read",
    ],
  },
] as const;

const systemLedgerAccounts = [
  {
    code: "INC_GENERAL",
    name: "General Fund Contributions",
    publicName: "General Fund",
    description: "Incoming unrestricted contributions.",
    category: LedgerAccountCategory.INCOME,
  },
  {
    code: "INC_PROJECT",
    name: "Project-Specific Contributions",
    publicName: "Project Fund",
    description: "Incoming contributions assigned to a project.",
    category: LedgerAccountCategory.INCOME,
  },
  {
    code: "DEP_PROJECT",
    name: "Project Deployment",
    publicName: "Project Deployment",
    description: "Funds deployed to active project stages.",
    category: LedgerAccountCategory.DEPLOYMENT,
  },
  {
    code: "EXP_OPERATIONS",
    name: "Operational Expense",
    publicName: "Operations",
    description: "Platform operating expenses.",
    category: LedgerAccountCategory.EXPENSE,
  },
  {
    code: "REF_PAYOUT",
    name: "Refunds",
    publicName: "Refunds",
    description: "Returned or reversed incoming payments.",
    category: LedgerAccountCategory.REFUND,
  },
] as const;

const defaultSettings: Array<{
  key: string;
  displayName: string;
  description: string;
  category: string;
  subcategory?: string;
  value: Prisma.InputJsonValue;
  defaultValue: Prisma.InputJsonValue;
  dataType: SettingDataType;
  accessLevel: SettingAccessLevel;
  cacheStrategy: SettingCacheStrategy;
  cacheTtlSeconds: number;
}> = [
  {
    key: "platform_name",
    displayName: "Platform Name",
    description: "Display name for the platform.",
    category: "platform",
    value: "MORRIS MONYE",
    defaultValue: "MORRIS MONYE",
    dataType: SettingDataType.STRING,
    accessLevel: SettingAccessLevel.PUBLIC,
    cacheStrategy: SettingCacheStrategy.STATIC,
    cacheTtlSeconds: 3600,
  },
  {
    key: "support_email",
    displayName: "Support Email",
    description: "Default support email address.",
    category: "platform",
    value: "support@seei.org",
    defaultValue: "support@seei.org",
    dataType: SettingDataType.EMAIL,
    accessLevel: SettingAccessLevel.PUBLIC,
    cacheStrategy: SettingCacheStrategy.STATIC,
    cacheTtlSeconds: 3600,
  },
  {
    key: "default_currency",
    displayName: "Default Currency",
    description: "Currency for ledger and project values.",
    category: "financial",
    value: "NGN",
    defaultValue: "NGN",
    dataType: SettingDataType.STRING,
    accessLevel: SettingAccessLevel.PUBLIC,
    cacheStrategy: SettingCacheStrategy.STATIC,
    cacheTtlSeconds: 3600,
  },
  {
    key: "minimum_pledge_amount",
    displayName: "Minimum Pledge Amount",
    description: "Lowest allowed pledge amount.",
    category: "financial",
    value: 5,
    defaultValue: 5,
    dataType: SettingDataType.NUMBER,
    accessLevel: SettingAccessLevel.PUBLIC,
    cacheStrategy: SettingCacheStrategy.DYNAMIC,
    cacheTtlSeconds: 300,
  },
  {
    key: "min_pledge_amount_to_vote",
    displayName: "Minimum Pledge Amount To Vote",
    description: "Minimum qualifying contributions for project voting.",
    category: "community",
    value: 10,
    defaultValue: 10,
    dataType: SettingDataType.NUMBER,
    accessLevel: SettingAccessLevel.PROTECTED,
    cacheStrategy: SettingCacheStrategy.DYNAMIC,
    cacheTtlSeconds: 300,
  },
  {
    key: "manual_active_villagers",
    displayName: "Manual Active supporters",
    description: "Fallback Active supporters metric.",
    category: "metrics",
    value: 2006,
    defaultValue: 2006,
    dataType: SettingDataType.NUMBER,
    accessLevel: SettingAccessLevel.PUBLIC,
    cacheStrategy: SettingCacheStrategy.DYNAMIC,
    cacheTtlSeconds: 900,
  },
  {
    key: "monthly_operational_costs",
    displayName: "Monthly Operational Costs",
    description: "Tracked monthly operating costs.",
    category: "financial",
    value: 12102,
    defaultValue: 12102,
    dataType: SettingDataType.NUMBER,
    accessLevel: SettingAccessLevel.PUBLIC,
    cacheStrategy: SettingCacheStrategy.DYNAMIC,
    cacheTtlSeconds: 900,
  },
  {
    key: "marquee_featured_items",
    displayName: "Marquee Featured Items",
    description: "Configured featured marquee cards.",
    category: "display",
    subcategory: "marquee",
    value: [],
    defaultValue: [],
    dataType: SettingDataType.JSON,
    accessLevel: SettingAccessLevel.PROTECTED,
    cacheStrategy: SettingCacheStrategy.DYNAMIC,
    cacheTtlSeconds: 900,
  },
] as const;

function parseName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed)
    return {
      firstName: "Platform",
      lastName: "Admin",
      displayName: "Platform Admin",
    };
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" ") || "Admin",
    displayName: trimmed,
  };
}

async function seedPermissionsAndRoles() {
  const permissions = new Map<string, string>();

  for (const [key, resource, action] of permissionCatalog) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: { resource, action },
      create: {
        key,
        resource,
        action,
        description: `${resource}:${action}`,
      },
    });

    permissions.set(key, permission.id);
  }

  for (const roleDefinition of roleCatalog) {
    const role = await prisma.role.upsert({
      where: { key: roleDefinition.key },
      update: {
        name: roleDefinition.name,
        description: roleDefinition.description,
        sortOrder: roleDefinition.sortOrder,
        isSystem: true,
      },
      create: {
        key: roleDefinition.key,
        name: roleDefinition.name,
        description: roleDefinition.description,
        sortOrder: roleDefinition.sortOrder,
        isSystem: true,
      },
    });

    for (const permissionKey of roleDefinition.permissionKeys) {
      const permissionId = permissions.get(permissionKey);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId,
        },
      });
    }
  }
}

async function seedLedgerAccounts() {
  for (const account of systemLedgerAccounts) {
    await prisma.ledgerAccount.upsert({
      where: { code: account.code },
      update: {
        name: account.name,
        publicName: account.publicName,
        description: account.description,
        category: account.category,
        isSystem: true,
        isActive: true,
      },
      create: {
        code: account.code,
        name: account.name,
        publicName: account.publicName,
        description: account.description,
        category: account.category,
        isSystem: true,
        isActive: true,
      },
    });
  }
}

async function seedSettings() {
  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {
        displayName: setting.displayName,
        description: setting.description,
        category: setting.category,
        subcategory: setting.subcategory,
        defaultValue: setting.defaultValue,
        dataType: setting.dataType,
        accessLevel: setting.accessLevel,
        cacheStrategy: setting.cacheStrategy,
        cacheTtlSeconds: setting.cacheTtlSeconds,
      },
      create: {
        ...setting,
      },
    });
  }
}

async function bootstrapSuperAdmin() {
  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.BOOTSTRAP_SUPER_ADMIN_NAME?.trim();

  if (!email || !name) {
    throw new Error(
      "BOOTSTRAP_SUPER_ADMIN_EMAIL and BOOTSTRAP_SUPER_ADMIN_NAME must be set for bootstrap.",
    );
  }

  const { firstName, lastName, displayName } = parseName(name);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      displayName,
      firstName,
      lastName,
      status: UserStatus.ACTIVE,
      onboardingState: UserOnboardingState.BOOTSTRAPPED,
      bootstrapSeededAt: new Date(),
    },
    create: {
      email,
      displayName,
      firstName,
      lastName,
      status: UserStatus.ACTIVE,
      onboardingState: UserOnboardingState.BOOTSTRAPPED,
      bootstrapSeededAt: new Date(),
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  const role = await prisma.role.findUniqueOrThrow({
    where: { key: "super_admin" },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
      assignedBy: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorType: AuditActorType.SYSTEM,
      targetUserId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "bootstrap_super_admin",
      summary: `Bootstrapped deterministic super admin for ${email}`,
      newValues: {
        email,
        role: "super_admin",
      },
    },
  });

  return user;
}

async function main() {
  await seedPermissionsAndRoles();
  await seedLedgerAccounts();
  await seedSettings();

  const bootstrapOnly = process.argv.includes("--bootstrap-super-admin");
  const user = await bootstrapSuperAdmin();

  if (!bootstrapOnly) {
    await prisma.event.upsert({
      where: { id: "00000000-0000-0000-0000-000000000001" },
      update: {
        title: "Bootstrap Completed",
        description: "Initial schema seed completed successfully.",
        eventType: EventType.UPDATE,
        status: EventStatus.COMPLETED,
      },
      create: {
        id: "00000000-0000-0000-0000-000000000001",
        creatorId: user.id,
        title: "Bootstrap Completed",
        description: "Initial schema seed completed successfully.",
        eventType: EventType.UPDATE,
        status: EventStatus.COMPLETED,
        startAt: new Date(),
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
