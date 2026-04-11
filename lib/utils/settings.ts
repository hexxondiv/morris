// lib/settings/manager.ts - Core settings management

import { supabaseAdmin } from '@/lib/supabase-admin';
import { 
  Setting, 
  AppSettings, 
  SettingKey, 
  CachedSetting,
  DEFAULT_SETTINGS 
} from '@/types/settings';

// Simple in-memory cache
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
  
  set(key: string, value: any, ttlSeconds: number): void {
    this.cache.set(key, {
      value,
      cachedAt: Date.now(),
      ttl: ttlSeconds
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

// Cast value based on type
function castValue(value: string, dataType: string): any {
  switch (dataType) {
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    case 'boolean':
      return value === 'true';
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    default:
      return value;
  }
}

// Get single setting with caching
export async function getSetting(key: string): Promise<any> {
  // Check cache first
  const cached = cache.get(key);
  if (cached !== null) return cached;

  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('value, data_type, cache_strategy, cache_ttl_seconds')
      .eq('key', key)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    const value = castValue(data.value, data.data_type);

    // Cache based on strategy
    if (data.cache_strategy !== 'realtime' && data.cache_ttl_seconds > 0) {
      cache.set(key, value, data.cache_ttl_seconds);
    }

    return value;
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return null;
  }
}

// Get multiple settings
export async function getSettings(keys: string[]): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  const uncachedKeys: string[] = [];

  // Check cache first
  for (const key of keys) {
    const cached = cache.get(key);
    if (cached !== null) {
      results[key] = cached;
    } else {
      uncachedKeys.push(key);
    }
  }

  // Fetch uncached settings
  if (uncachedKeys.length > 0) {
    try {
      const { data, error } = await supabaseAdmin
        .from('settings')
        .select('key, value, data_type, cache_strategy, cache_ttl_seconds')
        .in('key', uncachedKeys)
        .eq('is_active', true);

      if (!error && data) {
        for (const setting of data) {
          const value = castValue(setting.value, setting.data_type);
          results[setting.key] = value;

          // Cache the result
          if (setting.cache_strategy !== 'realtime' && setting.cache_ttl_seconds > 0) {
            cache.set(setting.key, value, setting.cache_ttl_seconds);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }

  return results;
}

// Get only public settings
export async function getPublicSettings(): Promise<Partial<AppSettings>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('key, value, data_type')
      .eq('access_level', 'public')
      .eq('is_active', true);

    if (error) throw error;

    const results: Record<string, any> = {};
    if (data) {
      for (const setting of data) {
        results[setting.key] = castValue(setting.value, setting.data_type);
      }
    }

    return results as Partial<AppSettings>;
  } catch (error) {
    console.error('Error fetching public settings:', error);
    return {};
  }
}

// Get setting with fallback to default
export async function getSettingWithFallback<K extends SettingKey>(
  key: K
): Promise<AppSettings[K]> {
  const value = await getSetting(key);
  return value !== null ? value : DEFAULT_SETTINGS[key];
}

// Clear cache for a setting
export function clearSettingCache(key: string): void {
  cache.delete(key);
}

// Clear all cache
export function clearAllCache(): void {
  cache.clear();
}