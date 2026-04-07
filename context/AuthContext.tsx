'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { fetchMe } from '@/utils/api';

interface AuthContextType {
  user: any;
  permissions: string[];
  loading: boolean;
  hasPermission: (code: string) => boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAuth = async () => {
    try {
      const data = await fetchMe();
      if (data.user) {
        setPermissions(data.user.Permissions || []);
        setUser(data.user);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuth();
  }, []);

  const hasPermission = (code: string) => {
    if (user?.Role_Name === 'Admin') return true;
    return permissions.includes(code);
  };

  return (
    <AuthContext.Provider value={{ user, permissions, loading, hasPermission, refreshAuth: loadAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
