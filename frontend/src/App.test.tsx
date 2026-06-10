import { describe, expect, it } from 'vitest';
import { getHomeRouteTarget } from './appRoutes';
import { restaurantDefaultRoute } from './features/restaurant/navigation/restaurantNavigation';

describe('App routing', () => {
  it('sends anonymous sessions to the login route first', () => {
    expect(getHomeRouteTarget('unauthenticated')).toBe('/login');
    expect(getHomeRouteTarget('expired')).toBe('/login');
    expect(getHomeRouteTarget('error')).toBe('/login');
  });

  it('sends authenticated sessions to the restaurant workspace', () => {
    expect(getHomeRouteTarget('authenticated')).toBe(restaurantDefaultRoute);
  });
});
