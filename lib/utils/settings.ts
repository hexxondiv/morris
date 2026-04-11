import {
  castJsonValue,
  findActiveSettingByKey,
  findActiveSettingsByKeys,
  findPublicActiveSettings,
} from "@/lib/repositories/settings-repository";
import { SettingCacheStrategy, type SettingDataType } from "@prisma/client";
import {
  AppSettings,
  CachedSetting,
  DEFAULT_SETTINGS,
  SettingKey,
} from "@/types/settings";

class SettingsCache {
  private cache = new Map<string, CachedSetting>();

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (cached.ttl > 0 && now - cached.cachedAt > cached.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return cached.value as T;
  }

  set(key: string, value: unknown, ttlSeconds: number): void {
    this.cache.set(key, {
      value,
      cachedAt: Date.now(),
      ttl: ttlSeconds,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new SettingsCache();

export async function getSetting(key: string): Promise<unknown> {
  const cached = cache.get(key);
  if (cached !== null) return cached;

  try {
    const row = await findActiveSettingByKey(key);
    if (!row) return null;

    const value = castJsonValue(row.value, row.dataType as SettingDataType);

    if (
      row.cacheStrategy !== SettingCacheStrategy.REALTIME &&
      row.cacheTtlSeconds > 0
    ) {
      cache.set(key, value, row.cacheTtlSeconds);
    }

    return value;
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return null;
  }
}

export async function getSettings(keys: string[]): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};
  const uncachedKeys: string[] = [];

  for (const key of keys) {
    const cached = cache.get(key);
    if (cached !== null) {
      results[key] = cached;
    } else {
      uncachedKeys.push(key);
    }
  }

  if (uncachedKeys.length > 0) {
    try {
      const rows = await findActiveSettingsByKeys(uncachedKeys);
      for (const setting of rows) {
        const value = castJsonValue(setting.value, setting.dataType);
        results[setting.key] = value;

        if (
          setting.cacheStrategy !== SettingCacheStrategy.REALTIME &&
          setting.cacheTtlSeconds > 0
        ) {
          cache.set(setting.key, value, setting.cacheTtlSeconds);
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  }

  return results;
}

export async function getPublicSettings(): Promise<Partial<AppSettings>> {
  try {
    const rows = await findPublicActiveSettings();
    const results: Record<string, unknown> = {};
    for (const setting of rows) {
      results[setting.key] = castJsonValue(setting.value, setting.dataType);
    }
    return results as Partial<AppSettings>;
  } catch (error) {
    console.error("Error fetching public settings:", error);
    return {};
  }
}

export async function getSettingWithFallback<K extends SettingKey>(
  key: K
): Promise<AppSettings[K]> {
  const value = await getSetting(key);
  return (value !== null ? value : DEFAULT_SETTINGS[key]) as AppSettings[K];
}

export function clearSettingCache(key: string): void {
  cache.delete(key);
}

export function clearAllCache(): void {
  cache.clear();
}
