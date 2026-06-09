import { RefreshCw } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import labels from '../../labels.es.json';
import { updateSetup, type RestaurantSetup } from '../../state/restaurantWorkspaceState';
import type { RestaurantAreaLayoutDetail, RestaurantFloorPlanSummary } from '../../types';
import { Field } from '../restaurantUi';

export function FloorPlanLiveToolbar({
  setup,
  setSetup,
  floorPlans,
  areas,
  isRefreshDisabled,
  isRefreshing,
  onRefresh,
}: {
  setup: RestaurantSetup;
  setSetup: Dispatch<SetStateAction<RestaurantSetup>>;
  floorPlans: RestaurantFloorPlanSummary[] | undefined;
  areas: RestaurantAreaLayoutDetail[];
  isRefreshDisabled: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="setup-panel live-toolbar" aria-label={labels.live.toolbar}>
      <Field label={labels.setup.branchId}>
        <input
          value={setup.branchId}
          onChange={(event) => updateSetup(setSetup, { branchId: event.target.value, floorPlanId: '' })}
          placeholder="00000000-0000-7000-8000-000000000101"
        />
      </Field>
      <Field label={labels.setup.floorId}>
        <input
          value={setup.floorId}
          onChange={(event) => updateSetup(setSetup, { floorId: event.target.value, floorPlanId: '', areaId: '' })}
          placeholder="00000000-0000-7000-8000-000000000201"
        />
      </Field>
      <Field label={labels.setup.floorPlan}>
        <select
          value={setup.floorPlanId}
          onChange={(event) => updateSetup(setSetup, { floorPlanId: event.target.value, areaId: '' })}
          disabled={!floorPlans?.length}
        >
          <option value="">{labels.states.floorPlanRequired}</option>
          {floorPlans?.map((floorPlanSummary) => (
            <option key={floorPlanSummary.id} value={floorPlanSummary.id}>
              {floorPlanSummary.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={labels.setup.areaFilter}>
        <select value={setup.areaId} onChange={(event) => updateSetup(setSetup, { areaId: event.target.value })}>
          <option value="">{labels.setup.allAreas}</option>
          {areas.map((area) => (
            <option key={area.areaId} value={area.areaId}>
              {area.areaName}
            </option>
          ))}
        </select>
      </Field>
      <Field label={labels.setup.date}>
        <input type="date" value={setup.date} onChange={(event) => updateSetup(setSetup, { date: event.target.value })} />
      </Field>
      <Field label={labels.setup.time}>
        <input
          type="time"
          value={setup.serviceTime}
          onChange={(event) => updateSetup(setSetup, { serviceTime: event.target.value })}
        />
      </Field>
      <button
        type="button"
        className="secondary-button live-refresh-button"
        disabled={isRefreshDisabled || isRefreshing}
        onClick={onRefresh}
      >
        <RefreshCw size={16} className={isRefreshing ? 'spin' : undefined} />
        {labels.actions.refresh}
      </button>
    </section>
  );
}
