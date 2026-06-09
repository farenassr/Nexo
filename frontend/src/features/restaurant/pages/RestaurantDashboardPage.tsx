import { BarChart3, CalendarDays, Utensils } from 'lucide-react';
import labels from '../labels.es.json';
import { EmptyState, Metric, PanelHeader } from '../components/restaurantUi';

export function RestaurantDashboardPage() {
  return (
    <main className="restaurant-page">
      <section className="restaurant-module-page">
        <PanelHeader icon={<BarChart3 size={18} />} title={labels.sections.dashboard} />
        <div className="metric-strip dashboard-metrics">
          <Metric label={labels.sections.reservations} value={0} />
          <Metric label={labels.status.occupied} value={0} />
          <Metric label={labels.status.available} value={0} />
          <Metric label={labels.status.cancelled} value={0} />
        </div>
        <EmptyState icon={<CalendarDays size={22} />} title={labels.states.noReservations} />
      </section>
      <section className="restaurant-module-page">
        <PanelHeader icon={<Utensils size={18} />} title={labels.sections.floor} />
        <EmptyState icon={<Utensils size={22} />} title={labels.states.floorPlanRequired} />
      </section>
    </main>
  );
}
