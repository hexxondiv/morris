"use server";

import type { Prisma } from "@prisma/client";
import {
  SettingAccessLevel,
  SettingCacheStrategy,
  SettingDataType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { getPrimaryRole } from "@/lib/auth/roles";
import { isAuthorized } from "../utils";
import type { Setting, SettingsApiResponse, ValidationResult } from "@/types/settings";
import {
  clearSettingCache,
  clearAllCache,
  getSetting,
  getSettings,
  getPublicSettings,
  getSettingWithFallback,
} from "../utils/settings";
import {
  getDefaultValueForReset,
  getSettingMetaForAccessCheck,
  getSettingTypeAndRules,
  listActiveSettingsForAccess,
  listSettingCategoriesForAccess,
  mapPrismaSettingToLegacy,
} from "@/lib/repositories/settings-repository";

function validateSetting(
  key: string,
  value: string,
  type: string,
  validationRules?: Record<string, unknown>
): string | null {
  try {
    switch (type) {
      case "number": {
        const num = parseFloat(value);
        if (isNaN(num)) {
          return `${key}: Value must be a valid number`;
        }
        if (validationRules?.min !== undefined && num < (validationRules.min as number)) {
          return `${key}: Value must be at least ${validationRules.min}`;
        }
        if (validationRules?.max !== undefined && num > (validationRules.max as number)) {
          return `${key}: Value must be at most ${validationRules.max}`;
        }
        break;
      }

      case "boolean":
        if (!["true", "false"].includes(value.toLowerCase())) {
          return `${key}: Value must be true or false`;
        }
        break;

      case "email": {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return `${key}: Must be a valid email address`;
        }
        break;
      }

      case "url":
        try {
          new URL(value);
        } catch {
          return `${key}: Must be a valid URL`;
        }
        break;

      case "json":
        try {
          JSON.parse(value);
        } catch {
          return `${key}: Must be valid JSON`;
        }
        break;

      case "string":
        if (validationRules?.minLength && value.length < (validationRules.minLength as number)) {
          return `${key}: Must be at least ${validationRules.minLength} characters`;
        }
        if (validationRules?.maxLength && value.length > (validationRules.maxLength as number)) {
          return `${key}: Must be at most ${validationRules.maxLength} characters`;
        }
        if (
          validationRules?.enum &&
          !(validationRules.enum as string[]).includes(value)
        ) {
          return `${key}: Must be one of: ${(validationRules.enum as string[]).join(", ")}`;
        }
        break;
    }

    return null;
  } catch (error) {
    return `${key}: Validation error - ${error}`;
  }
}

function apiTypeToDataType(type: string): SettingDataType {
  const map: Record<string, SettingDataType> = {
    number: SettingDataType.NUMBER,
    string: SettingDataType.STRING,
    boolean: SettingDataType.BOOLEAN,
    json: SettingDataType.JSON,
    email: SettingDataType.EMAIL,
    url: SettingDataType.URL,
    color: SettingDataType.COLOR,
  };
  return map[type] ?? SettingDataType.STRING;
}

function parseValueToJson(value: string, type: string): Prisma.InputJsonValue {
  switch (type) {
    case "number":
      return parseFloat(value);
    case "boolean":
      return value.toLowerCase() === "true";
    case "json":
      return JSON.parse(value) as Prisma.InputJsonValue;
    default:
      return value;
  }
}

async function checkAccess(
  settingKey: string,
  operation: "read" | "write" = "read"
): Promise<boolean> {
  const meta = await getSettingMetaForAccessCheck(settingKey);
  if (!meta) return false;

  const user = await getCurrentUser();
  const role = user ? getPrimaryRole(user.userRoles) : "user";

  if (operation === "read") {
    if (meta.accessLevel === SettingAccessLevel.PUBLIC) return true;
    if (!user) return false;
    if (meta.accessLevel === SettingAccessLevel.PROTECTED) {
      return isAuthorized(role, "moderator");
    }
    return isAuthorized(role, "moderator");
  }

  if (!user) return false;
  if (meta.isEncrypted || meta.accessLevel === SettingAccessLevel.SENSITIVE) {
    return isAuthorized(role, "admin");
  }
  return isAuthorized(role, "moderator");
}

export async function getAllSettings(): Promise<Setting[]> {
  const user = await getCurrentUser();
  const isAuthenticated = Boolean(user);
  const primary = user ? getPrimaryRole(user.userRoles) : "user";
  const isAdmin = isAuthorized(primary, "admin");

  const rows = await listActiveSettingsForAccess({ isAdmin, isAuthenticated });
  return rows.map(mapPrismaSettingToLegacy);
}

export async function saveSetting(
  key: string,
  value: string,
  type: string,
  description?: string
): Promise<{ success: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Admin access required");
  }

  const role = getPrimaryRole(user.userRoles);
  if (!isAuthorized(role, "moderator")) {
    throw new Error("Unauthorized: Insufficient permissions");
  }

  const validTypes = ["number", "string", "boolean", "json", "email", "url", "color"];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}`);
  }

  const existing = await prisma.setting.findUnique({ where: { key } });
  const valueJson = parseValueToJson(value, type);
  const dataType = apiTypeToDataType(type);

  await prisma.setting.upsert({
    where: { key },
    create: {
      key,
      displayName: key
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      description: description || `Setting for ${key}`,
      category: key.includes("maintenance") ? "Technical" : "General",
      subcategory: key.includes("maintenance") ? "Operations" : "General",
      value: valueJson,
      defaultValue: valueJson,
      dataType,
      accessLevel: key.includes("maintenance")
        ? SettingAccessLevel.SENSITIVE
        : SettingAccessLevel.PUBLIC,
      cacheStrategy: SettingCacheStrategy.DYNAMIC,
      cacheTtlSeconds: 300,
      isEncrypted: key.includes("maintenance"),
      isActive: true,
      sortOrder: 999,
      updatedById: user.id,
      createdById: user.id,
    },
    update: {
      value: valueJson,
      dataType,
      description: description || existing?.description,
      updatedById: user.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/admin/settings");

  return {
    success: true,
    message: `Setting ${key} saved successfully`,
  };
}

export async function saveSettings(
  settings: Array<{
    key: string;
    value: string;
    type: string;
    description?: string;
    default_value?: string;
    category?: string;
    display_name: string;
  }>
): Promise<SettingsApiResponse> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Admin access required");
  }

  const role = getPrimaryRole(user.userRoles);
  if (!isAuthorized(role, "moderator")) {
    throw new Error(`Unauthorized: ${role} does not have permission to save settings`);
  }

  if (!settings || !Array.isArray(settings) || settings.length === 0) {
    throw new Error("No settings provided to save");
  }

  const existingSettings = await getAllSettings();
  const existingSettingsMap = new Map(existingSettings.map((s) => [s.key, s]));

  const validTypes = ["number", "string", "boolean", "json", "email", "url", "color"];
  const validationErrors: string[] = [];

  for (const setting of settings) {
    const hasAccess = await checkAccess(setting.key, "write");
    if (!hasAccess) {
      validationErrors.push(`Unauthorized access to setting: ${setting.key}`);
      continue;
    }

    if (!validTypes.includes(setting.type)) {
      validationErrors.push(
        `Invalid type for ${setting.key}: ${setting.type}. Must be one of ${validTypes.join(", ")}`
      );
      continue;
    }

    const existingSetting = existingSettingsMap.get(setting.key);
    const validationError = validateSetting(
      setting.key,
      setting.value,
      setting.type,
      existingSetting?.validation_rules as unknown as
        | Record<string, unknown>
        | undefined
    );

    if (validationError) {
      validationErrors.push(validationError);
    }
  }

  if (validationErrors.length > 0) {
    throw new Error(`Validation errors:\n${validationErrors.join("\n")}`);
  }

  for (const setting of settings) {
    const valueJson = parseValueToJson(setting.value, setting.type);
    const dataType = apiTypeToDataType(setting.type);
    await prisma.setting.upsert({
      where: { key: setting.key },
      create: {
        key: setting.key,
        displayName: setting.display_name,
        description: setting.description ?? "",
        category: setting.category ?? "General",
        value: valueJson,
        defaultValue: setting.default_value
          ? parseValueToJson(setting.default_value, setting.type)
          : valueJson,
        dataType,
        accessLevel: SettingAccessLevel.PROTECTED,
        cacheStrategy: SettingCacheStrategy.DYNAMIC,
        cacheTtlSeconds: 300,
        isEncrypted: false,
        isActive: true,
        sortOrder: 0,
        createdById: user.id,
        updatedById: user.id,
      },
      update: {
        value: valueJson,
        dataType,
        displayName: setting.display_name,
        description: setting.description,
        defaultValue: setting.default_value
          ? parseValueToJson(setting.default_value, setting.type)
          : undefined,
        updatedById: user.id,
      },
    });
    clearSettingCache(setting.key);
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/admin/settings");

  return {
    success: true,
    message: `Successfully saved ${settings.length} settings`,
  };
}

export async function resetSetting(key: string): Promise<SettingsApiResponse> {
  const hasAccess = await checkAccess(key, "write");
  if (!hasAccess) {
    throw new Error("Unauthorized: Insufficient permissions to reset settings");
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Admin access required");
  }

  const meta = await getDefaultValueForReset(key);
  if (!meta) {
    throw new Error(`Setting ${key} not found`);
  }

  await prisma.setting.update({
    where: { key },
    data: {
      value: meta.defaultValue as Prisma.InputJsonValue,
      updatedById: user.id,
    },
  });

  clearSettingCache(key);

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/admin/settings");

  return {
    success: true,
    message: `Setting ${key} reset to default value`,
  };
}

export async function getSettingCategories() {
  const user = await getCurrentUser();
  const isAuthenticated = Boolean(user);
  const primary = user ? getPrimaryRole(user.userRoles) : "user";
  const isModerator = isAuthorized(primary, "moderator");

  const data = await listSettingCategoriesForAccess({
    isModerator,
    isAuthenticated,
  });

  const categories = data.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = new Set();
      }
      if (item.subcategory) {
        acc[item.category].add(item.subcategory);
      }
      return acc;
    },
    {} as Record<string, Set<string>>
  );

  return Object.entries(categories).map(([category, subcategories]) => ({
    category,
    subcategories: Array.from(subcategories),
  }));
}

export async function validateSettingValue(
  key: string,
  value: unknown
): Promise<ValidationResult> {
  try {
    const row = await getSettingTypeAndRules(key);
    if (!row) {
      return { valid: false, errors: ["Setting not found"] };
    }

    const typeLabel = String(row.dataType).toLowerCase();
    const error = validateSetting(
      key,
      String(value),
      typeLabel,
      row.validationRules as unknown as Record<string, unknown> | undefined
    );

    return {
      valid: !error,
      errors: error ? [error] : [],
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : "Validation failed"],
    };
  }
}

export async function clearSettingsCache(): Promise<SettingsApiResponse> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Authentication required");
  }

  const role = getPrimaryRole(user.userRoles);
  if (!isAuthorized(role, "admin")) {
    throw new Error("Unauthorized: Admin access required");
  }

  clearAllCache();

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/admin/settings");

  return {
    success: true,
    message: "Settings cache cleared successfully",
  };
}

export {
  getSetting,
  getSettings,
  getPublicSettings,
  getSettingWithFallback,
};
