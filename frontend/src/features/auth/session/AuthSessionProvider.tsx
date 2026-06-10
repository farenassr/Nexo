import { useEffect, type ReactNode } from 'react';
import { useAuthSessionStore } from './authSessionStore';

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const reload = useAuthSessionStore((state) => state.reload);

  useEffect(() => {
    void reload();
  }, [reload]);

  return children;
}

export function useAuthSession() {
  return useAuthSessionStore();
}
