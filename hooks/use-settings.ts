// hooks/useSettings.ts - React hooks for settings

import { useEffect, useState } from 'react';
import type { Setting, AppSettings, SettingKey, ValidationResult } from '@/types/settings';
import { useSettingsStore } from '@/app/stores/settings';

// Hook for getting a single setting
export function useSetting<K extends keyof AppSettings>(key: K): AppSettings[K] | undefined {
  const getSetting = useSettingsStore(state => state.getSetting);
  const fetchPublicSettings = useSettingsStore(state => state.fetchPublicSettings);
  const [value, setValue] = useState<AppSettings[K] | undefined>();

  useEffect(() => {
    const currentValue = getSetting(key);
    setValue(currentValue);

    // If not found in store, try to fetch public settings
    if (currentValue === undefined) {
      fetchPublicSettings();
    }
  }, [key, getSetting, fetchPublicSettings]);

  return value;
}

// Hook for multiple settings
export function useSettings<K extends keyof AppSettings>(
  keys: K[]
): Partial<Pick<AppSettings, K>> {
  const getSetting = useSettingsStore(state => state.getSetting);
  const [settings, setSettings] = useState<Partial<Pick<AppSettings, K>>>({});

  useEffect(() => {
    const newSettings: Partial<Pick<AppSettings, K>> = {};
    keys.forEach(key => {
      const value = getSetting(key);
      if (value !== undefined) {
        newSettings[key] = value;
      }
    });
    setSettings(newSettings);
  }, [keys, getSetting]);

  return settings;
}

// Hook for all public settings
export function usePublicSettings(): Partial<AppSettings> {
  const publicSettings = useSettingsStore(state => state.publicSettings);
  const fetchPublicSettings = useSettingsStore(state => state.fetchPublicSettings);

  useEffect(() => {
    if (Object.keys(publicSettings).length === 0) {
      fetchPublicSettings();
    }
  }, [publicSettings, fetchPublicSettings]);

  return publicSettings;
}

// Hook for admin settings management
export function useAdminSettings() {
  const store = useSettingsStore();
  
  useEffect(() => {
    // Initialize data on mount
    if (store.categories.length === 0) {
      store.fetchCategories();
    }
    if (store.settings.length === 0) {
      store.fetchSettings();
    }
  }, []);

  return {
    // Data
    settings: store.settings,
    categories: store.categories,
    filteredSettings: store.getFilteredSettings(),
    groupedSettings: store.getGroupedSettings(),
    
    // UI state
    activeCategory: store.activeCategory,
    searchTerm: store.searchTerm,
    showSensitive: store.showSensitive,
    hasChanges: store.hasChanges,
    loading: store.loading,
    saving: store.saving,
    error: store.error,
    
    // Actions
    updateSetting: store.updateSetting,
    saveAllSettings: store.saveAllSettings,
    resetSetting: store.resetSetting,
    
    // UI actions
    setActiveCategory: store.setActiveCategory,
    setSearchTerm: store.setSearchTerm,
    setShowSensitive: store.setShowSensitive,
    clearError: store.clearError,
    
    // Utility functions
    getSetting: store.getSetting,
  };
}

// Hook for setting validation
export function useSettingValidation() {
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});

  const validate = async (key: string, value: any): Promise<ValidationResult> => {
    try {
      const response = await fetch('/api/settings/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const result = await response.json();
      setValidationResults(prev => ({
        ...prev,
        [key]: result
      }));
      
      return result;
    } catch (error) {
      const errorResult = { 
        valid: false, 
        errors: [error instanceof Error ? error.message : 'Validation failed'] 
      };
      
      setValidationResults(prev => ({
        ...prev,
        [key]: errorResult
      }));
      
      return errorResult;
    }
  };

  const clearValidation = (key: string) => {
    setValidationResults(prev => {
      const newResults = { ...prev };
      delete newResults[key];
      return newResults;
    });
  };

  const getValidationResult = (key: string): ValidationResult | undefined => {
    return validationResults[key];
  };

  const hasErrors = (key: string): boolean => {
    const result = validationResults[key];
    return result ? !result.valid : false;
  };

  return {
    validate,
    clearValidation,
    getValidationResult,
    hasErrors,
  };
}

// Hook for single setting with save functionality
export function useSettingWithSave(key: string) {
  const getSetting = useSettingsStore(state => state.getSetting);
  const [value, setValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentValue = getSetting(key);
    if (currentValue !== undefined) {
      setValue(String(currentValue));
    }
  }, [key, getSetting]);

  const saveSetting = async (newValue: string, type: string = 'string') => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: newValue, type })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save setting');
      }

      setValue(newValue);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save setting';
      setError(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    value,
    setValue,
    saveSetting,
    saving,
    error,
    clearError: () => setError(null)
  };
}

// Hook for computed settings values
export function useComputedSetting<T>(
  keys: string[],
  compute: (values: Record<string, any>) => T,
  deps: any[] = []
): T | undefined {
  const getSetting = useSettingsStore(state => state.getSetting);
  const [result, setResult] = useState<T | undefined>();

  useEffect(() => {
    const values: Record<string, any> = {};
    let hasAllValues = true;

    for (const key of keys) {
      const value = getSetting(key);
      if (value === undefined) {
        hasAllValues = false;
        break;
      }
      values[key] = value;
    }

    if (hasAllValues) {
      setResult(compute(values));
    } else {
      setResult(undefined);
    }
  }, [keys, getSetting, ...deps]);

  return result;
}

// Hook for conditional settings loading
export function useConditionalSettings(
  condition: boolean,
  keys: string[]
): Record<string, any> {
  const getSetting = useSettingsStore(state => state.getSetting);
  const [settings, setSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    if (condition) {
      const newSettings: Record<string, any> = {};
      keys.forEach(key => {
        const value = getSetting(key);
        if (value !== undefined) {
          newSettings[key] = value;
        }
      });
      setSettings(newSettings);
    } else {
      setSettings({});
    }
  }, [condition, keys, getSetting]);

  return settings;
}