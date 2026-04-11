import type { Prisma } from "@prisma/client";
import {
  SettingAccessLevel,
  SettingCacheStrategy,
  SettingDataType,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Setting } from "@/types/settings";

export function castJsonValue(value: unknown, dataType: SettingDataType): unknown {
  switch (dataType) {
    case SettingDataType.NUMBER: {
      const n =
        typeof value === "number"
          ? value
          : parseFloat(typeof value === "string" ? value : String(value));
      return Number.isNaN(n) ? 0 : n;
    }
    case SettingDataType.BOOLEAN:
      return value === true || value === "true";
    case SettingDataType.JSON:
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }
      return value;
    default:
      return value === null || value === undefined ? "" : String(value);
  }
}

export async function findActiveSettingByKey(key: string) {
  return prisma.setting.findFirst({
    where: { key, isActive: true },
  });
}

export async function findActiveSettingsByKeys(keys: string[]) {
  if (keys.length === 0) return [];
  return prisma.setting.findMany({
    where: { key: { in: keys }, isActive: true },
  });
}

export async function findPublicActiveSettings() {
  return prisma.setting.findMany({
    where: { accessLevel: SettingAccessLevel.PUBLIC, isActive: true },
    select: { key: true, value: true, dataType: true },
  });
}

export async function listActiveSettingsForAccess(params: {
  isAdmin: boolean;
  isAuthenticated: boolean;
}) {
  const base: Prisma.SettingWhereInput = { isActive: true };
  if (!params.isAuthenticated) {
    return prisma.setting.findMany({
      where: { ...base, accessLevel: SettingAccessLevel.PUBLIC },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { displayName: "asc" }],
    });
  }
  if (!params.isAdmin) {
    return prisma.setting.findMany({
      where: {
        ...base,
        accessLevel: { in: [SettingAccessLevel.PUBLIC, SettingAccessLevel.PROTECTED] },
      },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { displayName: "asc" }],
    });
  }
  return prisma.setting.findMany({
    where: base,
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { displayName: "asc" }],
  });
}

export async function listSettingCategoriesForAccess(params: {
  isModerator: boolean;
  isAuthenticated: boolean;
}) {
  const base: Prisma.SettingWhereInput = { isActive: true };
  let where: Prisma.SettingWhereInput = base;
  if (!params.isAuthenticated) {
    where = { ...base, accessLevel: SettingAccessLevel.PUBLIC };
  } else if (!params.isModerator) {
    where = {
      ...base,
      accessLevel: { in: [SettingAccessLevel.PUBLIC, SettingAccessLevel.PROTECTED] },
    };
  }
  return prisma.setting.findMany({
    where,
    select: { category: true, subcategory: true },
    orderBy: [{ category: "asc" }, { subcategory: "asc" }],
  });
}

export function mapPrismaSettingToLegacy(row: Prisma.SettingGetPayload<object>): Setting {
  const valueStr =
    typeof row.value === "string" ? row.value : JSON.stringify(row.value);
  const defaultStr =
    row.defaultValue === null || row.defaultValue === undefined
      ? ""
      : typeof row.defaultValue === "string"
        ? row.defaultValue
        : JSON.stringify(row.defaultValue);

  return {
    id: row.id,
    key: row.key,
    value: valueStr,
    default_value: defaultStr,
    data_type: row.dataType.toLowerCase() as Setting["data_type"],
    category: row.category,
    subcategory: row.subcategory ?? undefined,
    display_name: row.displayName,
    description: row.description ?? "",
    validation_rules: (row.validationRules as Setting["validation_rules"]) ?? undefined,
    access_level: row.accessLevel.toLowerCase() as Setting["access_level"],
    cache_strategy: row.cacheStrategy.toLowerCase() as Setting["cache_strategy"],
    cache_ttl_seconds: row.cacheTtlSeconds,
    is_encrypted: row.isEncrypted,
    is_active: row.isActive,
    sort_order: row.sortOrder,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    created_by: row.createdById ?? undefined,
    updated_by: row.updatedById ?? undefined,
  };
}

export async function getSettingMetaForAccessCheck(key: string) {
  return prisma.setting.findFirst({
    where: { key, isActive: true },
    select: { accessLevel: true, isEncrypted: true },
  });
}

export async function getSettingTypeAndRules(key: string) {
  return prisma.setting.findFirst({
    where: { key, isActive: true },
    select: { dataType: true, validationRules: true },
  });
}

export async function getDefaultValueForReset(key: string) {
  return prisma.setting.findFirst({
    where: { key, isActive: true },
    select: { defaultValue: true, dataType: true },
  });
}

export { SettingAccessLevel, SettingDataType, SettingCacheStrategy };
