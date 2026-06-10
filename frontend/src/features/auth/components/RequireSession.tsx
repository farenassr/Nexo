import { Loader2, LogIn, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuthSession } from '../session/AuthSessionProvider';

export function RequireSession({ children }: { children: ReactNode }) {
  const { status, login, reload } = useAuthSession();

  if (status === 'loading') {
    return (
      <main className="auth-page">
        <div className="auth-panel">
          <Loader2 className="spin" size={22} aria-hidden="true" />
          <p>Cargando sesion.</p>
        </div>
      </main>
    );
  }

  if (status !== 'authenticated') {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <h1>Sesion requerida</h1>
          <p>{status === 'expired' ? 'La sesion expiro.' : 'Necesitas iniciar sesion para continuar.'}</p>
          <div className="auth-actions">
            <button className="secondary-button" type="button" onClick={() => void reload()}>
              <RefreshCw size={18} aria-hidden="true" />
              Reintentar
            </button>
            <button className="primary-button compact-button" type="button" onClick={login}>
              <LogIn size={18} aria-hidden="true" />
              Iniciar sesion
            </button>
          </div>
        </section>
      </main>
    );
  }

  return children;
}
