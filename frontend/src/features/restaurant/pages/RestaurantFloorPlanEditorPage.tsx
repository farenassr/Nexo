import { PenTool } from 'lucide-react';
import labels from '../labels.es.json';
import { EmptyState, PanelHeader } from '../components/restaurantUi';

export function RestaurantFloorPlanEditorPage() {
  return (
    <main className="restaurant-page">
      <section className="restaurant-module-page">
        <PanelHeader icon={<PenTool size={18} />} title={labels.sections.floorEditor} />
        <EmptyState icon={<PenTool size={22} />} title={labels.states.floorPlanRequired} />
      </section>
    </main>
  );
}
