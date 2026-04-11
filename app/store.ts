import { create } from 'zustand'
import { type SupabaseClient } from '@supabase/supabase-js'
import { persist } from 'zustand/middleware';


export interface UserProfile {
  id: string;
  first_name: string | null; // Allow null to match Supabase
  last_name: string | null;
  email: string; // Non-nullable, as Clerk always provides email
  role: "user" | "moderator" | "editor" | "admin" | null; // Allow null
  avatar_url: string | null; // Allow null
  created_at: string;
}

interface UserStore {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  clearProfile: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      clearProfile: () => set({ profile: null }),
    }),
    {
      name: "user-profile",
      partialize: (state) => ({ profile: state.profile }), // Persist only profile
    }
  )
);


type State = {
  header: string;
  setHeader: (path: string) => void;
};

const headerMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/admin/projects': 'Projects',
  '/admin/users': 'User Management',
  '/admin/dashboard': 'Admin Dashboard',
};

export const usePageHeader = create<State>((set) => ({
  header: headerMap['/dashboard'],
  setHeader: (path: string) =>
    set(() => ({
      header: headerMap[normalizePath(path)] || 'Dashboard',
    })),
}));

// Optional: Normalize trailing slashes
function normalizePath(path: string) {
  return path.endsWith('/') ? path.slice(0, -1) : path;
}