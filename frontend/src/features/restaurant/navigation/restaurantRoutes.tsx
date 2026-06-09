import { createRoute, Navigate, type AnyRoute } from '@tanstack/react-router';
import { RestaurantWorkspaceShell } from '../components/RestaurantWorkspaceShell';
import { RestaurantDashboardPage } from '../pages/RestaurantDashboardPage';
import { RestaurantFloorPlanEditorPage } from '../pages/RestaurantFloorPlanEditorPage';
import { RestaurantFloorPlanLivePage } from '../pages/RestaurantFloorPlanLivePage';
import { RestaurantReservationsPage } from '../pages/RestaurantReservationsPage';
import { RestaurantSetupPage } from '../pages/RestaurantSetupPage';
import { restaurantDefaultRoute } from './restaurantNavigation';

export function createRestaurantRoutes(rootRoute: AnyRoute) {
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <Navigate to={restaurantDefaultRoute as never} replace />,
  });

  const restaurantRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/restaurant',
    component: RestaurantWorkspaceShell,
  });

  const dashboardRoute = createRoute({
    getParentRoute: () => restaurantRoute,
    path: 'dashboard',
    component: RestaurantDashboardPage,
  });

  const floorPlanRoute = createRoute({
    getParentRoute: () => restaurantRoute,
    path: 'floor-plan',
    component: RestaurantFloorPlanLivePage,
  });

  const reservationsRoute = createRoute({
    getParentRoute: () => restaurantRoute,
    path: 'reservations',
    component: RestaurantReservationsPage,
  });

  const floorPlanEditorRoute = createRoute({
    getParentRoute: () => restaurantRoute,
    path: 'floor-plan-editor',
    component: RestaurantFloorPlanEditorPage,
  });

  const setupRoute = createRoute({
    getParentRoute: () => restaurantRoute,
    path: 'setup',
    component: RestaurantSetupPage,
  });

  restaurantRoute.addChildren([dashboardRoute, floorPlanRoute, reservationsRoute, floorPlanEditorRoute, setupRoute]);

  return [indexRoute, restaurantRoute];
}
