import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Armchair, BarChart3, CalendarDays, CalendarPlus, Clock, Utensils, XCircle } from 'lucide-react';
import labels from '../labels.es.json';
import { EmptyState, InlineError, PanelHeader, SkeletonRows } from '../components/restaurantUi';
import { getRestaurantDashboard } from '../api/restaurantApi';
import { DashboardMetricCard } from '../components/dashboard/DashboardMetricCard';
import { OccupancyByHourChart } from '../components/dashboard/OccupancyByHourChart';
import { UpcomingReservationsPanel } from '../components/dashboard/UpcomingReservationsPanel';
import { CreateReservationModal } from '../components/reservations/CreateReservationModal';
import { restaurantQueryKeys } from '../queryKeys';
import { useStoredSetup } from '../state/restaurantWorkspaceState';
import type { RestaurantDashboardMetric } from '../types';

export function RestaurantDashboardPage() {
  const [setup] = useStoredSetup();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const canLoadDashboard = setup.branchId.length > 0 && setup.date.length > 0;
  const dashboardQuery = useQuery({
    queryKey: restaurantQueryKeys.dashboard(setup.branchId, setup.date),
    queryFn: () => getRestaurantDashboard({ branchId: setup.branchId, date: setup.date }),
    enabled: canLoadDashboard,
    staleTime: 30_000,
  });
  const metrics = normalizeMetrics(dashboardQuery.data?.metrics);

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
        {!canLoadDashboard ? <EmptyState icon={<CalendarDays size={22} />} title={labels.states.branchRequired} /> : null}
        {dashboardQuery.isPending && canLoadDashboard ? <SkeletonRows count={3} /> : null}
        {dashboardQuery.isError ? <InlineError error={dashboardQuery.error} /> : null}
        {dashboardQuery.data ? (
          <>
            <div className="dashboard-metric-grid">
              {metrics.map((metric) => (
                <DashboardMetricCard key={metric.key} metric={metric} icon={metricIcon(metric.key)} />
              ))}
            </div>
            <div className="dashboard-insights-grid">
              <section className="dashboard-panel">
                <PanelHeader icon={<BarChart3 size={18} />} title="Ocupacion por hora" />
                <OccupancyByHourChart points={dashboardQuery.data.occupancyByHour} />
              </section>
              <section className="dashboard-panel">
                <PanelHeader icon={<Clock size={18} />} title="Proximas reservas" />
                <UpcomingReservationsPanel reservations={dashboardQuery.data.upcomingReservations} />
              </section>
            </div>
          </>
        ) : null}
      </section>
      <section className="restaurant-module-page">
        <PanelHeader icon={<Utensils size={18} />} title={labels.sections.floor} />
        <EmptyState icon={<Utensils size={22} />} title={labels.states.floorPlanRequired} />
      </section>
      <CreateReservationModal open={isCreateModalOpen} setup={setup} onClose={() => setIsCreateModalOpen(false)} />
    </main>
  );
}

const dashboardMetricLabels: Record<string, string> = {
  todayReservations: 'Reservas de hoy',
  occupiedTables: 'Mesas ocupadas',
  freeTables: 'Mesas libres',
  upcomingReservations: 'Proximas reservas',
  cancellations: 'Cancelaciones',
  noShows: labels.status.noShow,
};

const emptyMetrics: RestaurantDashboardMetric[] = Object.entries(dashboardMetricLabels).map(([key, label]) => ({
  key,
  label,
  value: 0,
}));

function normalizeMetrics(metrics: RestaurantDashboardMetric[] | undefined) {
  if (!metrics) {
    return emptyMetrics;
  }

  const byKey = new Map(metrics.map((metric) => [metric.key, metric]));
  return emptyMetrics.map((fallback) => {
    const metric = byKey.get(fallback.key);
    return {
      ...fallback,
      value: metric?.value ?? fallback.value,
    };
  });
}

function metricIcon(key: string) {
  switch (key) {
    case 'occupiedTables':
      return <Armchair size={18} />;
    case 'freeTables':
      return <Utensils size={18} />;
    case 'upcomingReservations':
      return <Clock size={18} />;
    case 'cancellations':
    case 'noShows':
      return <XCircle size={18} />;
    default:
      return <CalendarDays size={18} />;
  }
}
