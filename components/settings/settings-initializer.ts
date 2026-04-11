'use client';

import { useSettingsStore } from '@/app/stores/settings';
import { useEffect } from 'react';

export function SettingsInitializer() {
  const fetchPublicSettings = useSettingsStore(state => state.fetchPublicSettings);

  useEffect(() => {
    // Fetch public settings immediately when app loads
    fetchPublicSettings();
  }, [fetchPublicSettings]);

  // This component renders nothing, just initializes settings
  return null;
}