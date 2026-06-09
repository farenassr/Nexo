import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OccupancyByHourChart } from './OccupancyByHourChart';

describe('OccupancyByHourChart', () => {
  it('renders a useful zero state when every hour is empty', () => {
    const markup = renderToStaticMarkup(
      <OccupancyByHourChart points={Array.from({ length: 24 }, (_, hour) => ({ hour, reservationCount: 0, occupiedCovers: 0, occupancyPercent: 0 }))} />,
    );

    expect(markup).toContain('Sin ocupacion registrada');
  });

  it('renders populated hour bars with accessible labels', () => {
    const markup = renderToStaticMarkup(
      <OccupancyByHourChart
        points={[
          { hour: 12, reservationCount: 2, occupiedCovers: 6, occupancyPercent: 50 },
          { hour: 13, reservationCount: 1, occupiedCovers: 3, occupancyPercent: 25 },
        ]}
      />,
    );

    expect(markup).toContain('12:00');
    expect(markup).toContain('50%');
    expect(markup).toContain('aria-label="12:00, 50% ocupacion"');
  });
});
