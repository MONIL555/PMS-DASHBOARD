'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { fetchOptions } from '../utils/api';

interface OptionsContextType {
  optionsMap: any;
  loading: boolean;
  error: string | null;
  refreshOptions: () => Promise<void>;
}

const OptionsContext = createContext<OptionsContextType | undefined>(undefined);

export const OptionsProvider = ({ children }: { children: ReactNode }) => {
  const [optionsMap, setOptionsMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOptions = async () => {
    try {
      setLoading(true);
      const data = await fetchOptions();
      setOptionsMap(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  return (
    <OptionsContext.Provider value={{ optionsMap, loading, error, refreshOptions: loadOptions }}>
      {children}
    </OptionsContext.Provider>
  );
};

export const useOptions = () => {
  const context = useContext(OptionsContext);
  if (context === undefined) {
    throw new Error('useOptions must be used within an OptionsProvider');
  }
  return context;
};
