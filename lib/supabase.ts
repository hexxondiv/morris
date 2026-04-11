// lib/supabase.ts
'use client';
import { createClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

// Environment variables - defined once only
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey,
  });
  throw new Error('Missing required Supabase environment variables');
}

console.log('✅ Supabase Config Check:', {
  url: supabaseUrl ? '✅ URL exists' : '❌ Missing URL',
  key: supabaseAnonKey ? '✅ Key exists' : '❌ Missing Key',
  // Don't log actual values in production
  ...(process.env.NODE_ENV === 'development' && { urlValue: supabaseUrl }),
});

// Create single Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Alias for backward compatibility if needed
export const supabaseClient = supabase;

// React hook for client-side Supabase
export function useSupabase() {
  return useMemo(() => ({ supabase }), []);
}