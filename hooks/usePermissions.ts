import { useAuth } from '@/context/AuthContext';

export function usePermissions() {
  const { hasPermission, permissions, user, loading } = useAuth();
  return { hasPermission, permissions, user, loading };
}
