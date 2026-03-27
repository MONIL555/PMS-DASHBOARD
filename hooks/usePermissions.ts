import { useState, useEffect } from 'react';
import { fetchMe } from '@/utils/api';

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchMe()
      .then(data => {
        if (!isMounted) return;
        if (data.user) {
          setPermissions(data.user.Permissions || []);
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const hasPermission = (code: string) => {
    if (user?.Role_Name === 'Admin') return true;
    return permissions.includes(code);
  };

  return { hasPermission, permissions, user, loading };
}
