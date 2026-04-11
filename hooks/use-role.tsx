import { useUser } from '@clerk/nextjs';
import { useMemo } from 'react';

type Role = 'user' | 'admin' | 'moderator';

export function useUserRole(defaultRole: Role = 'user'): Role {
  const { user } = useUser();

  return useMemo(() => {
    return (user?.publicMetadata?.role as Role) ?? defaultRole;
  }, [user?.publicMetadata?.role, defaultRole]);
}