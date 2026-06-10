import { LogIn } from 'lucide-react';
import { redirectToLogin } from '../api/authApi';

export function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-icon">
          <LogIn size={22} aria-hidden="true" />
        </div>
        <h1>Nexo</h1>
        <p>Inicia sesion para continuar.</p>
        <button className="primary-button compact-button" type="button" onClick={() => redirectToLogin('/')}>
          <LogIn size={18} aria-hidden="true" />
          Iniciar sesion
        </button>
      </section>
    </main>
  );
}
