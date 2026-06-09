import type { ReactNode } from 'react';
import type { RestaurantDashboardMetric } from '../../types';

export function DashboardMetricCard({ metric, icon }: { metric: RestaurantDashboardMetric; icon: ReactNode }) {
  return (
    <div className="dashboard-metric-card">
      <span className="dashboard-metric-icon">{icon}</span>
      <div>
        <strong>{metric.value}</strong>
        <span>{metric.label}</span>
      </div>
    </div>
  );
}
