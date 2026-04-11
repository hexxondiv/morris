// lib/actions/settings.ts - Enhanced server actions

"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../supabase-admin";
import { getUserRoleFromClerk } from ".";
// import { 
//   getSetting, 
//   getSettings, 
//   getPublicSettings, 
//   getSettingWithFallback,
//   clearSettingCache,
//   clearAllCache
// } from "@/lib/settings/manager";
import type { Setting, SettingsApiResponse, ValidationResult } from "@/types/settings";
import { clearSettingCache, clearAllCache, getSetting, getSettings, getPublicSettings, getSettingWithFallback } from "../utils/settings";
import { requireRole } from "../clerk";
import { isAuthorized } from "../utils";

// Validation function
function validateSetting(
  key: string,
  value: string,
  type: string,
  validationRules?: any
): string | null {
  try {
    switch (type) {
      case "number":
        const num = parseFloat(value);
        if (isNaN(num)) {
          return `${key}: Value must be a valid number`;
        }
        if (validationRules?.min !== undefined && num < validationRules.min) {
          return `${key}: Value must be at least ${validationRules.min}`;
        }
        if (validationRules?.max !== undefined && num > validationRules.max) {
          return `${key}: Value must be at most ${validationRules.max}`;
        }
        break;

      case "boolean":
        if (!["true", "false"].includes(value.toLowerCase())) {
          return `${key}: Value must be true or false`;
        }
        break;

      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return `${key}: Must be a valid email address`;
        }
        break;

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
        if (validationRules?.minLength && value.length < validationRules.minLength) {
          return `${key}: Must be at least ${validationRules.minLength} characters`;
        }
        if (validationRules?.maxLength && value.length > validationRules.maxLength) {
          return `${key}: Must be at most ${validationRules.maxLength} characters`;
        }
        if (validationRules?.enum && !validationRules.enum.includes(value)) {
          return `${key}: Must be one of: ${validationRules.enum.join(", ")}`;
        }
        break;
    }

    return null; // No validation errors
  } catch (error) {
    return `${key}: Validation error - ${error}`;
  }
}

// Check if user can access setting
async function checkAccess(settingKey: string, operation: 'read' | 'write' = 'read'): Promise<boolean> {
  const { userId } = await auth();
  
  // Get setting info from your existing columns
  const { data: settingData } = await supabaseAdmin
    .from("settings")
    .select("access_level, is_encrypted")
    .eq("key", settingKey)
    .single();

  if (!settingData) return false;

  // For reading:
  if (operation === 'read') {
    // Public settings - anyone can read
    if (settingData.access_level === 'public') return true;
    
    // Non-public settings - need authentication
    if (!userId) return false;
    
    const role = await getUserRoleFromClerk(userId);
    return isAuthorized(role, "moderator");
  }

  // For writing:
  if (!userId) return false;
  
  const role = await getUserRoleFromClerk(userId);
  
  // Encrypted settings - admin only (treating as sensitive)
  if (settingData.is_encrypted || settingData.access_level === 'admin') {
    return isAuthorized(role, "admin");
  }
  
  // Other settings - moderator and above
  return isAuthorized(role, "moderator");
}

// Get all settings with access control
export async function getAllSettings(): Promise<Setting[]> {
  try {
    const { userId } = await auth();
    
    let query = supabaseAdmin
      .from("settings")
      .select("*")
      .eq("is_active", true);

    // Apply access control based on user role
    if (!userId) {
      query = query.eq("access_level", "public");
    } else {
      const role = await getUserRoleFromClerk(userId);
      
      if (!isAuthorized(role, "admin")) {
        // Non-admins can see public and protected settings
        query = query.in("access_level", ["public", "protected"]);
      }
      // Admins can see all settings (no additional filter)
    }

    const { data, error } = await query.order("category, sort_order, display_name");

    if (error) {
      throw new Error(`Error fetching settings: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching all settings:", error);
    throw error;
  }
}

export async function saveSetting(
  key: string,
  value: string,
  type: string,
  description?: string
): Promise<any> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Admin access required");
    }

    const role = await getUserRoleFromClerk(userId);
    if (!isAuthorized(role, "moderator")) {
      throw new Error("Unauthorized: Insufficient permissions");
    }

    const validTypes = ["number", "string", "boolean", "json", "email", "url", "color"];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid type: ${type}`);
    }

    // Get existing setting
    const { data: existingSetting } = await supabaseAdmin
      .from("settings")
      .select("validation_rules, description")
      .eq("key", key)
      .single();

    // Simple validation
    if (type === "boolean" && !["true", "false"].includes(value.toLowerCase())) {
      throw new Error(`${key}: Value must be true or false`);
    }

    // Upsert setting
    const { error } = await supabaseAdmin.from("settings").upsert(
      {
        key,
        value,
        data_type: type,
        description: description || existingSetting?.description || `Setting for ${key}`,
        updated_at: new Date().toISOString(),
        updated_by: userId,
        // Add defaults for new settings
        ...(existingSetting ? {} : { 
          default_value: value,
          category: key.includes('maintenance') ? 'Technical' : 'General',
          subcategory: key.includes('maintenance') ? 'Operations' : 'General',
          display_name: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          is_encrypted: key.includes('maintenance'),
          access_level: key.includes('maintenance') ? 'admin' : 'public',
          sort_order: 999,
          is_active: true
        })
      },
      { onConflict: "key" }
    );

    if (error) {
      throw new Error(`Error saving setting ${key}: ${error.message}`);
    }

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/admin/settings");

    return { 
      success: true, 
      message: `Setting ${key} saved successfully` 
    };
  } catch (error) {
    console.error(`Error saving setting ${key}:`, error);
    throw error;
  }
}

// Save multiple settings
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
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Admin access required");
    }

    const role = await getUserRoleFromClerk(userId);
    const requiredRole = "moderator";
    if (!isAuthorized(role, requiredRole)) {
      throw new Error(`Unauthorized: ${role} does not have permission to save settings`);
    }

    if (!settings || !Array.isArray(settings) || settings.length === 0) {
      throw new Error("No settings provided to save");
    }

    // Get existing settings for validation
    const existingSettings = await getAllSettings();
    const existingSettingsMap = new Map(existingSettings.map((s) => [s.key, s]));

    // Validate all settings first
    const validTypes = ["number", "string", "boolean", "json", "email", "url", "color"];
    const validationErrors: string[] = [];

    for (const setting of settings) {
      // Check access for each setting
      const hasAccess = await checkAccess(setting.key, 'write');
      if (!hasAccess) {
        validationErrors.push(`Unauthorized access to setting: ${setting.key}`);
        continue;
      }

      // Type validation
      if (!validTypes.includes(setting.type)) {
        validationErrors.push(
          `Invalid type for ${setting.key}: ${setting.type}. Must be one of ${validTypes.join(", ")}`
        );
        continue;
      }

      // Value validation
      const existingSetting = existingSettingsMap.get(setting.key);
      const validationError = validateSetting(
        setting.key,
        setting.value,
        setting.type,
        existingSetting?.validation_rules
      );

      if (validationError) {
        validationErrors.push(validationError);
      }
    }

    if (validationErrors.length > 0) {
      console.log(JSON.stringify(validationErrors));
      throw new Error(`Validation errors:\n${validationErrors.join("\n")}`);
    }

    // Prepare settings for upsert
    const settingsToUpsert = settings.map((setting) => ({
      key: setting.key,
      value: setting.value,
      data_type: setting.type,
      default_value: setting.default_value,
      category: setting.category,
      display_name: setting.display_name,
      description: setting.description,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }));

    // Upsert settings
    const { error } = await supabaseAdmin
      .from("settings")
      .upsert(settingsToUpsert, { onConflict: "key" });

    if (error) {
      throw new Error(`Error saving settings: ${JSON.stringify(error)}`);
    }

    // Clear cache for updated settings
    settings.forEach(setting => clearSettingCache(setting.key));

    // Revalidate paths
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/admin/settings");

    return {
      success: true,
      message: `Successfully saved ${settings.length} settings`,
    };
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
}

// Reset setting to default
export async function resetSetting(key: string): Promise<SettingsApiResponse> {
  try {
    const hasAccess = await checkAccess(key, 'write');
    if (!hasAccess) {
      throw new Error("Unauthorized: Insufficient permissions to reset settings");
    }

    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get default value
    const { data, error: fetchError } = await supabaseAdmin
      .from("settings")
      .select("default_value, data_type")
      .eq("key", key)
      .eq("is_active", true)
      .single();

    if (fetchError || !data) {
      throw new Error(`Setting ${key} not found`);
    }

    // Update with default value
    const { error: updateError } = await supabaseAdmin
      .from("settings")
      .update({
        value: data.default_value,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("key", key);

    if (updateError) {
      throw new Error(`Error resetting setting ${key}: ${updateError.message}`);
    }

    // Clear cache
    clearSettingCache(key);

    // Revalidate paths
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/admin/settings");

    return { 
      success: true, 
      message: `Setting ${key} reset to default value` 
    };
  } catch (error) {
    console.error(`Error resetting setting ${key}:`, error);
    throw error;
  }
}

// Get setting categories
export async function getSettingCategories() {
  try {
    const { userId } = await auth();
    
    let query = supabaseAdmin
      .from("settings")
      .select("category, subcategory")
      .eq("is_active", true);

    // Apply access control
    if (!userId) {
      query = query.eq("access_level", "public");
    } else {
      const auth = await requireRole('moderator');
      if (!auth.authorized) {
        query = query.in("access_level", ["public", "protected"]);
      }
    }

    const { data, error } = await query.order("category, subcategory");

    if (error) {
      throw new Error(`Error fetching categories: ${error.message}`);
    }

    // Group by category
    const categories = (data || []).reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = new Set();
      }
      if (item.subcategory) {
        acc[item.category].add(item.subcategory);
      }
      return acc;
    }, {} as Record<string, Set<string>>);

    // Convert sets to arrays
    return Object.entries(categories).map(([category, subcategories]) => ({
      category,
      subcategories: Array.from(subcategories)
    }));
  } catch (error) {
    console.error("Error fetching setting categories:", error);
    throw error;
  }
}

// Validate setting value
export async function validateSettingValue(
  key: string, 
  value: any
): Promise<ValidationResult> {
  try {
    // Get setting info
    const { data } = await supabaseAdmin
      .from('settings')
      .select('data_type, validation_rules')
      .eq('key', key)
      .single();
    if (!data) {
      return { valid: false, errors: ['Setting not found'] };
    }

    const error = validateSetting(key, String(value), data.data_type, data.validation_rules);
    
    return {
      valid: !error,
      errors: error ? [error] : []
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Validation failed']
    };
  }
}

// Clear all settings cache (admin only)
export async function clearSettingsCache(): Promise<SettingsApiResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Authentication required");
    }

    const role = await getUserRoleFromClerk(userId);
    if (!isAuthorized(role, "admin")) {
      throw new Error("Unauthorized: Admin access required");
    }

    clearAllCache();

    // Revalidate all paths
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/admin/settings");

    return { 
      success: true, 
      message: "Settings cache cleared successfully" 
    };
  } catch (error) {
    console.error("Error clearing settings cache:", error);
    throw error;
  }
}

// Helper functions for new settings
function getDefaultCategory(key: string): string {
  if (key.includes('maintenance')) return 'Technical';
  if (key.includes('platform') || key.includes('support')) return 'General';
  if (key.includes('currency') || key.includes('amount') || key.includes('fee')) return 'Financial';
  if (key.includes('user') || key.includes('community')) return 'Community';
  if (key.includes('display') || key.includes('show') || key.includes('enable')) return 'Display';
  return 'Other';
}

function getDefaultSubcategory(key: string): string {
  if (key.includes('maintenance')) return 'Operations';
  if (key.includes('platform')) return 'Branding';
  if (key.includes('fee') || key.includes('currency')) return 'Currency';
  if (key.includes('user')) return 'Users';
  return 'General';
}

function getDefaultDisplayName(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Export the manager functions for direct use
export { 
  getSetting, 
  getSettings, 
  getPublicSettings, 
  getSettingWithFallback 
};