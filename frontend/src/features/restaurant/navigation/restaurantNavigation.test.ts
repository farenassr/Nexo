import { describe, expect, it } from 'vitest';
import {
  isRestaurantSetupRoute,
  restaurantDefaultRoute,
  restaurantNavigationItems,
  restaurantSetupNavigationItems,
} from './restaurantNavigation';

describe('restaurantNavigation', () => {
  it('exposes the restaurant workspace routes requested by the module phase', () => {
    expect(restaurantDefaultRoute).toBe('/restaurant/floor-plan');
    expect(restaurantNavigationItems.map((item) => item.to)).toEqual([
      '/restaurant/dashboard',
      '/restaurant/floor-plan',
      '/restaurant/reservations',
      '/restaurant/floor-plan-editor',
      '/restaurant/setup',
    ]);
  });

  it('exposes setup child navigation labels without backend auth wiring', () => {
    expect(restaurantSetupNavigationItems).toEqual([
      'Ciudades',
      'Sucursales',
      'Pisos',
      'Zonas',
      'Mesas',
      'Horarios',
      'Feriados / dias especiales',
      'Reglas de duracion',
      'Buffer de rotacion',
    ]);
  });

  it('detects setup routes for contextual setup navigation', () => {
    expect(isRestaurantSetupRoute('/restaurant/setup')).toBe(true);
    expect(isRestaurantSetupRoute('/restaurant/setup?tab=tables')).toBe(true);
    expect(isRestaurantSetupRoute('/restaurant/floor-plan')).toBe(false);
  });
});
