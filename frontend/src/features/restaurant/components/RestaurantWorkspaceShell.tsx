import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import labels from '../labels.es.json';
import {
  isRestaurantSetupRoute,
  restaurantNavigationItems,
  restaurantSetupNavigationItems,
} from '../navigation/restaurantNavigation';
import { RestaurantContextBar } from './RestaurantContextBar';

export function RestaurantWorkspaceShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showSetupNavigation = isRestaurantSetupRoute(pathname);

  return (
    <div className="restaurant-workspace-shell">
      <aside className="restaurant-sidebar" aria-label={labels.app.workspaceTitle}>
        <div className="restaurant-sidebar-brand">
          <span className="eyebrow">{labels.app.eyebrow}</span>
          <strong>{labels.app.workspaceTitle}</strong>
        </div>
        <nav className="restaurant-main-nav">
          {restaurantNavigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to as never} activeProps={{ 'data-active': true }}>
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {showSetupNavigation && (
          <nav className="restaurant-setup-nav" aria-label={labels.sections.setup}>
            {restaurantSetupNavigationItems.map((item) => (
              <button key={item} type="button">
                {item}
              </button>
            ))}
          </nav>
        )}
      </aside>
      <div className="restaurant-workspace-main">
        <RestaurantContextBar />
        <Outlet />
      </div>
    </div>
  );
}
