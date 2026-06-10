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
  return useAuthSessionStore((state) => ({
    session: state.session,
    status: state.status,
    reload: state.reload,
    login: state.login,
    logout: state.logout,
  }));
}
