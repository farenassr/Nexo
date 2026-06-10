import { create } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { anonymousSession, getCurrentSession, logout, redirectToLogin, type AuthSession } from '../api/authApi';

export type AuthSessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'expired' | 'error';

export interface AuthSessionStore {
  session: AuthSession;
  status: AuthSessionStatus;
  reload: () => Promise<void>;
  login: () => void;
  logout: () => Promise<void>;
}

interface AuthSessionStoreDependencies {
  getCurrentSession: () => Promise<AuthSession>;
  logout: () => Promise<string | null>;
  redirectToLogin: () => void;
}

const defaultDependencies: AuthSessionStoreDependencies = {
  getCurrentSession,
  logout,
  redirectToLogin,
};

export function createAuthSessionStore(
  dependencies: AuthSessionStoreDependencies = defaultDependencies,
): StoreApi<AuthSessionStore> {
  return createStore<AuthSessionStore>((set) => ({
    session: anonymousSession,
    status: 'loading',
    reload: async () => {
      set({ status: 'loading' });
      try {
        const current = await dependencies.getCurrentSession();
        set({
          session: current,
          status: current.isAuthenticated ? 'authenticated' : 'unauthenticated',
        });
      } catch {
        set({
          session: anonymousSession,
          status: 'error',
        });
      }
    },
    login: () => dependencies.redirectToLogin(),
    logout: async () => {
      try {
        const logoutUrl = await dependencies.logout();
        set({
          session: anonymousSession,
          status: 'unauthenticated',
        });
        if (logoutUrl) {
          globalThis.location.assign(logoutUrl);
        }
      } catch {
        set({
          session: anonymousSession,
          status: 'expired',
        });
      }
    },
  }));
}

export const useAuthSessionStore = create<AuthSessionStore>()((set) => ({
  session: anonymousSession,
  status: 'loading',
  reload: async () => {
    set({ status: 'loading' });
    try {
      const current = await getCurrentSession();
      set({
        session: current,
        status: current.isAuthenticated ? 'authenticated' : 'unauthenticated',
      });
    } catch {
      set({
        session: anonymousSession,
        status: 'error',
      });
    }
  },
  login: () => redirectToLogin(),
  logout: async () => {
    try {
      const logoutUrl = await logout();
      set({
        session: anonymousSession,
        status: 'unauthenticated',
      });
      if (logoutUrl) {
        globalThis.location.assign(logoutUrl);
      }
    } catch {
      set({
        session: anonymousSession,
        status: 'expired',
      });
    }
  },
}));
