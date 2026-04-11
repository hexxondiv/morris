// lib/stores/settings.ts - Zustand store for settings

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Setting, SettingCategory, AppSettings } from '@/types/settings';

interface SettingsState {
  // Data
  settings: Setting[];
  publicSettings: Partial<AppSettings>;
  categories: SettingCategory[];
  
  // UI State
  activeCategory: string;
  searchTerm: string;
  showSensitive: boolean;
  hasChanges: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  
  // Actions
  setSettings: (settings: Setting[]) => void;
  setPublicSettings: (settings: Partial<AppSettings>) => void;
  setCategories: (categories: SettingCategory[]) => void;
  updateSetting: (key: string, value: string) => void;
  setActiveCategory: (category: string) => void;
  setSearchTerm: (term: string) => void;
  setShowSensitive: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  setHasChanges: (hasChanges: boolean) => void;
  
  // Computed getters
  getSetting: (key: string) => any;
  getFilteredSettings: () => Setting[];
  getGroupedSettings: () => Record<string, Setting[]>;
  
  // Data fetching
  fetchSettings: (category?: string) => Promise<void>;
  fetchPublicSettings: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  
  // Actions
  saveAllSettings: () => Promise<void>;
  resetSetting: (key: string) => void;
  clearError: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      settings: [],
      publicSettings: {},
      categories: [],
      activeCategory: 'General',
      searchTerm: '',
      showSensitive: false,
      hasChanges: false,
      loading: false,
      saving: false,
      error: null,

      // Setters
      setSettings: (settings) => set({ settings }),
      setPublicSettings: (publicSettings) => set({ publicSettings }),
      setCategories: (categories) => set({ categories }),
      setActiveCategory: (activeCategory) => set({ activeCategory }),
      setSearchTerm: (searchTerm) => set({ searchTerm }),
      setShowSensitive: (showSensitive) => set({ showSensitive }),
      setLoading: (loading) => set({ loading }),
      setSaving: (saving) => set({ saving }),
      setError: (error) => set({ error }),
      setHasChanges: (hasChanges) => set({ hasChanges }),
      clearError: () => set({ error: null }),

      // Update setting in memory
      updateSetting: (key, value) => {
        set(state => ({
          settings: state.settings.map(setting =>
            setting.key === key ? { ...setting, value } : setting
          ),
          hasChanges: true
        }));
      },

      // Reset setting to default
      resetSetting: (key) => {
        set(state => ({
          settings: state.settings.map(setting =>
            setting.key === key 
              ? { ...setting, value: setting.default_value }
              : setting
          ),
          hasChanges: true
        }));
      },

      // Get single setting value
      getSetting: (key) => {
        const state = get();
        
        // Check public settings first (for client-side)
        const publicValue = state.publicSettings[key as keyof AppSettings];
        if (publicValue !== undefined) {
          return publicValue;
        }

        // Check admin settings
        const setting = state.settings.find(s => s.key === key);
        if (!setting) return undefined;

        // Cast value based on type
        switch (setting.data_type) {
          case 'number':
            return parseFloat(setting.value) || 0;
          case 'boolean':
            return setting.value === 'true';
          case 'json':
            try {
              return JSON.parse(setting.value);
            } catch {
              return null;
            }
          default:
            return setting.value;
        }
      },

      // Get filtered settings
      getFilteredSettings: () => {
        const { settings, searchTerm, activeCategory, showSensitive } = get();
        
        return settings.filter(setting => {
          const matchesSearch = 
            setting.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            setting.description.toLowerCase().includes(searchTerm.toLowerCase());
          
          const matchesCategory = 
            activeCategory === 'All' || setting.category === activeCategory;
          
          const showBasedOnSensitivity = 
            showSensitive || !setting.is_encrypted;
          
          return matchesSearch && matchesCategory && showBasedOnSensitivity;
        });
      },

      // Get settings grouped by subcategory
      getGroupedSettings: () => {
        const filteredSettings = get().getFilteredSettings();
        
        return filteredSettings.reduce((acc, setting) => {
          const key = setting.subcategory || 'Other';
          if (!acc[key]) acc[key] = [];
          acc[key].push(setting);
          return acc;
        }, {} as Record<string, Setting[]>);
      },

      // Fetch settings from API
      fetchSettings: async (category) => {
        set({ loading: true, error: null });
        
        try {
          const params = new URLSearchParams();
          if (category && category !== 'All') {
            params.append('category', category);
          }
          
          const response = await fetch(`/api/settings?${params}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch settings: ${response.statusText}`);
          }
          
          const data = await response.json();
          set({ 
            settings: data,
            loading: false,
            activeCategory: category || get().activeCategory
          });
        } catch (error) {
          console.error('Error fetching settings:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch settings',
            loading: false 
          });
        }
      },

      // Fetch public settings
      fetchPublicSettings: async () => {
        try {
          const response = await fetch('/api/settings/public');
          if (!response.ok) {
            throw new Error('Failed to fetch public settings');
          }
          
          const data = await response.json();
          set({ publicSettings: data });
        } catch (error) {
          console.error('Error fetching public settings:', error);
        }
      },

      // Fetch categories
      fetchCategories: async () => {
        try {
          const response = await fetch('/api/settings/categories');
          if (!response.ok) {
            throw new Error('Failed to fetch categories');
          }
          
          const data = await response.json();
          set({ categories: data });
        } catch (error) {
          console.error('Error fetching categories:', error);
        }
      },

      // Save all settings
      saveAllSettings: async () => {
        set({ saving: true, error: null });
        
        try {
          const { settings } = get();
          const settingsToSave = settings.map(setting => ({
            key: setting.key,
            value: setting.value,
            type: setting.data_type,
            description: setting.description,
            default_value: setting.default_value,
            category: setting.category,
            display_name: setting.display_name,
          }));

          const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: settingsToSave }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save settings');
          }

          set({ hasChanges: false, saving: false });
          
          // Refresh public settings
          get().fetchPublicSettings();
          
        } catch (error) {
          console.error('Error saving settings:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to save settings',
            saving: false 
          });
          throw error;
        }
      },
    }),
    {
      name: 'settings-store',
      partialize: (state) => ({
        publicSettings: state.publicSettings,
        activeCategory: state.activeCategory,
        showSensitive: state.showSensitive,
      }),
    }
  )
);

// Initialize public settings on app start (client-side only)
if (typeof window !== 'undefined') {
  useSettingsStore.getState().fetchPublicSettings();
}