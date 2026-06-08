import { QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import './App.css';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { RestaurantReservationsPage } from './features/restaurant/pages/RestaurantReservationsPage';
import { queryClient } from './lib/query/queryClient';

const rootRoute = createRootRoute({
  component: RootLayout,
});

const restaurantRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: RestaurantReservationsPage,
});

const routeTree = rootRoute.addChildren([restaurantRoute]);

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
      <Toaster position="bottom-right" richColors closeButton />
    </QueryClientProvider>
  );
}

export default App;
