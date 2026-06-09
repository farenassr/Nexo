import type { RestaurantOccupancyByHourPoint } from '../../types';

export function OccupancyByHourChart({ points }: { points: RestaurantOccupancyByHourPoint[] }) {
  const hasOccupancy = points.some((point) => point.occupancyPercent > 0);
  const chartPoints = points.length > 0 ? points : Array.from({ length: 24 }, (_, hour) => ({ hour, reservationCount: 0, occupiedCovers: 0, occupancyPercent: 0 }));

  return (
    <div className="occupancy-chart">
      {!hasOccupancy ? <p>Sin ocupacion registrada</p> : null}
      <div className="occupancy-bars" role="img" aria-label="Ocupacion por hora">
        {chartPoints.map((point) => (
          <div className="occupancy-hour" key={point.hour}>
            <div className="occupancy-track">
              <span
                aria-label={`${formatHour(point.hour)}, ${point.occupancyPercent}% ocupacion`}
                style={{ height: `${Math.max(point.occupancyPercent, 4)}%` }}
              />
            </div>
            <strong>{point.occupancyPercent}%</strong>
            <small>{formatHour(point.hour)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}
