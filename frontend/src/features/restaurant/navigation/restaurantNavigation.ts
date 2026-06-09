import { BarChart3, CalendarDays, Map, PenTool, Settings } from 'lucide-react';
import labels from '../labels.es.json';

export const restaurantDefaultRoute = '/restaurant/floor-plan';

export const restaurantNavigationItems = [
  {
    label: labels.navigation.dashboard,
    to: '/restaurant/dashboard',
    icon: BarChart3,
  },
  {
    label: labels.navigation.floorPlan,
    to: '/restaurant/floor-plan',
    icon: Map,
  },
  {
    label: labels.navigation.reservations,
    to: '/restaurant/reservations',
    icon: CalendarDays,
  },
  {
    label: labels.navigation.floorPlanEditor,
    to: '/restaurant/floor-plan-editor',
    icon: PenTool,
  },
  {
    label: labels.navigation.setup,
    to: '/restaurant/setup',
    icon: Settings,
  },
] as const;

export const restaurantSetupNavigationItems = [
  labels.setupNavigation.cities,
  labels.setupNavigation.branches,
  labels.setupNavigation.floors,
  labels.setupNavigation.areas,
  labels.setupNavigation.tables,
  labels.setupNavigation.openingHours,
  labels.setupNavigation.specialDays,
  labels.setupNavigation.durationRules,
  labels.setupNavigation.turnoverBuffer,
] as const;

export function isRestaurantSetupRoute(pathname: string) {
  return pathname.startsWith('/restaurant/setup');
}
