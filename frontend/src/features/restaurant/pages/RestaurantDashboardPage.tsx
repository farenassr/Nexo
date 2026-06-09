import { useState } from 'react';
import { BarChart3, CalendarDays, CalendarPlus, Utensils } from 'lucide-react';
import labels from '../labels.es.json';
import { EmptyState, Metric, PanelHeader } from '../components/restaurantUi';
import { CreateReservationModal } from '../components/reservations/CreateReservationModal';
import { useStoredSetup } from '../state/restaurantWorkspaceState';

export function RestaurantDashboardPage() {
  const [setup] = useStoredSetup();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <main className="restaurant-page">
      <section className="restaurant-module-page">
        <PanelHeader
          icon={<BarChart3 size={18} />}
          title={labels.sections.dashboard}
          action={
            <button type="button" className="primary-button compact-button" onClick={() => setIsCreateModalOpen(true)}>
              <CalendarPlus size={16} />
              {labels.actions.create}
            </button>
          }
        />
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
      <CreateReservationModal open={isCreateModalOpen} setup={setup} onClose={() => setIsCreateModalOpen(false)} />
    </main>
  );
}
