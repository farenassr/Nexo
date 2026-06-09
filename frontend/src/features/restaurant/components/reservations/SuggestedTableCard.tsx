import { Utensils } from 'lucide-react';
import labels from '../../labels.es.json';
import type { RestaurantAvailabilityTableOption } from '../../types';

export function SuggestedTableCard({
  table,
  selected,
  onToggle,
}: {
  table: RestaurantAvailabilityTableOption;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" className="suggested-table-card" aria-pressed={selected} onClick={onToggle}>
      <span className="suggested-table-icon">
        <Utensils size={15} />
      </span>
      <strong>{table.label}</strong>
      <small>
        {table.minCapacity}-{table.maxCapacity} {labels.fields.party.toLowerCase()}
      </small>
    </button>
  );
}
