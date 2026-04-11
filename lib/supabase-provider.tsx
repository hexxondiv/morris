'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useSession, useUser } from '@clerk/nextjs'
import { createContext, useContext, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useUserStore } from '@/app/store'
import { Role } from '@/types/database.types'

type SupabaseContext = {
  supabase: SupabaseClient | null
  isLoaded: boolean
}

const Context = createContext<SupabaseContext>({
  supabase: null,
  isLoaded: false
})

type Props = {
  children: React.ReactNode
}

export default function SupabaseProvider({ children }: Props) {
  const { session } = useSession()
  const { user, isLoaded: clerkLoaded } = useUser()
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const setProfile = useUserStore((state) => state.setProfile)
  const clearProfile = useUserStore((state) => state.clearProfile)

  useEffect(() => {
    if(!session) return

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      accessToken: () => session?.getToken()
    })
    setSupabase(client)
    setIsLoaded(true)
  }, [session])

  useEffect(() => {
    if (!clerkLoaded) return;

    if (user) {
      setProfile({
        id: user.id,
        first_name: user.firstName || '',
        last_name: user.lastName || '',
        email: user.primaryEmailAddress?.emailAddress || '',
        role: user.publicMetadata?.role as Role || 'user', // or derive from your own logic
        avatar_url: user.imageUrl || '',
        created_at: new Date().toISOString(), // or fetch from your backend if available
      })
    } else {
      clearProfile();
    }
  }, [user, clerkLoaded, setProfile, clearProfile])

  return (
    <Context.Provider value={{ supabase, isLoaded }}>
      {!isLoaded ? <Loader2 /> : children}
    </Context.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return { 
    supabase: context.supabase,
    isLoaded: context.isLoaded
  }
}
