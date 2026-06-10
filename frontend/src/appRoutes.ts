import type { AuthSessionStatus } from './features/auth/session/authSessionStore';
import { restaurantDefaultRoute } from './features/restaurant/navigation/restaurantNavigation';

export const loginRoutePath = '/login';

export function getHomeRouteTarget(status: AuthSessionStatus) {
  return status === 'authenticated' ? restaurantDefaultRoute : loginRoutePath;
}
