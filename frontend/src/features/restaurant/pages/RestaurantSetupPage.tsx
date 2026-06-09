import { Settings } from 'lucide-react';
import labels from '../labels.es.json';
import { restaurantSetupNavigationItems } from '../navigation/restaurantNavigation';
import { EmptyState, PanelHeader } from '../components/restaurantUi';

export function RestaurantSetupPage() {
  return (
    <main className="restaurant-page">
      <section className="restaurant-module-page">
        <PanelHeader icon={<Settings size={18} />} title={labels.sections.setup} />
        <div className="setup-module-grid">
          {restaurantSetupNavigationItems.map((item) => (
            <button key={item} type="button" className="setup-module-tile">
              {item}
            </button>
          ))}
        </div>
        <EmptyState icon={<Settings size={22} />} title={labels.states.branchRequired} />
      </section>
    </main>
  );
}
