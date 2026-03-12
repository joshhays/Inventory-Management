import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEPLOYMENTS, getDeploymentById, type Deployment } from '@/constants/deployments';

const STORAGE_KEY = '@inventory/deployment_id';

type DeploymentContextValue = {
  deployment: Deployment | null;
  isLoading: boolean;
  selectDeployment: (deployment: Deployment) => Promise<void>;
  clearDeployment: () => Promise<void>;
};

const DeploymentContext = createContext<DeploymentContextValue | null>(null);

export function DeploymentProvider({ children }: { children: React.ReactNode }) {
  const [deployment, setDeploymentState] = useState<Deployment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const d = getDeploymentById(stored);
          if (d) {
            setDeploymentState(d);
            setApiBase(d.apiBase);
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const selectDeployment = useCallback(async (d: Deployment) => {
    await AsyncStorage.setItem(STORAGE_KEY, d.id);
    setDeploymentState(d);
    setApiBase(d.apiBase);
  }, []);

  const clearDeployment = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setDeploymentState(null);
    setApiBase(null);
  }, []);

  return (
    <DeploymentContext.Provider
      value={{
        deployment,
        isLoading,
        selectDeployment,
        clearDeployment,
      }}>
      {children}
    </DeploymentContext.Provider>
  );
}

export function useDeployment() {
  const ctx = useContext(DeploymentContext);
  if (!ctx) throw new Error('useDeployment must be used within DeploymentProvider');
  return ctx;
}

// Module-level API base for lib/api.ts (set when deployment is selected)
let _apiBase: string | null = null;

export function setApiBase(base: string | null) {
  _apiBase = base;
}

export function getApiBase(): string {
  if (!_apiBase) throw new Error('No deployment selected');
  return _apiBase;
}
