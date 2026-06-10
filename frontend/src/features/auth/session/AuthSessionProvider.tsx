import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { anonymousSession, getCurrentSession, logout, redirectToLogin, type AuthSession } from '../api/authApi';

type AuthSessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'expired' | 'error';

interface AuthSessionContextValue {
  session: AuthSession;
  status: AuthSessionStatus;
  reload: () => Promise<void>;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>(anonymousSession);
  const [status, setStatus] = useState<AuthSessionStatus>('loading');

  const reload = useCallback(async () => {
    setStatus('loading');
    try {
      const current = await getCurrentSession();
      setSession(current);
      setStatus(current.isAuthenticated ? 'authenticated' : 'unauthenticated');
    } catch {
      setSession(anonymousSession);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      session,
      status,
      reload,
      login: () => redirectToLogin(),
      logout: async () => {
        try {
          const logoutUrl = await logout();
          setSession(anonymousSession);
          setStatus('unauthenticated');
          if (logoutUrl) {
            globalThis.location.assign(logoutUrl);
          }
        } catch {
          setSession(anonymousSession);
          setStatus('expired');
        }
      },
    }),
    [reload, session, status],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const value = useContext(AuthSessionContext);
  if (!value) {
    throw new Error('useAuthSession must be used inside AuthSessionProvider.');
  }

  return value;
}
