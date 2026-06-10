import { QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import './App.css';
import { getHomeRouteTarget } from './appRoutes';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoginPage } from './features/auth/components/LoginPage';
import { RequireSession } from './features/auth/components/RequireSession';
import { AuthSessionProvider, useAuthSession } from './features/auth/session/AuthSessionProvider';
import { createRestaurantRoutes } from './features/restaurant/navigation/restaurantRoutes';
import { queryClient } from './lib/query/queryClient';

const rootRoute = createRootRoute({
  component: RootLayout,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomeRoute,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  component: AuthenticatedLayout,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  authenticatedRoute.addChildren(createRestaurantRoutes(authenticatedRoute)),
]);

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function RootLayout() {
  return (
    <div className="app-shell">
      <Outlet />
    </div>
  );
}

function AuthenticatedLayout() {
  return (
    <RequireSession>
      <Outlet />
    </RequireSession>
  );
}

function HomeRoute() {
  const { status } = useAuthSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'authenticated') {
      void navigate({ to: getHomeRouteTarget(status) as never, replace: true });
    }
  }, [navigate, status]);

  if (status === 'loading') {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <p>Cargando sesion.</p>
        </section>
      </main>
    );
  }

  if (status !== 'authenticated') {
    return <LoginPage />;
  }

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
      </AuthSessionProvider>
      <Toaster position="bottom-right" richColors closeButton />
    </QueryClientProvider>
  );
}

export default App;
