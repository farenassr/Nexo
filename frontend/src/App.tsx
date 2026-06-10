import { QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import './App.css';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoginPage } from './features/auth/components/LoginPage';
import { RequireSession } from './features/auth/components/RequireSession';
import { AuthSessionProvider } from './features/auth/session/AuthSessionProvider';
import { createRestaurantRoutes } from './features/restaurant/navigation/restaurantRoutes';
import { queryClient } from './lib/query/queryClient';

const rootRoute = createRootRoute({
  component: RootLayout,
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
