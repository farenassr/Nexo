import type { Dispatch, SetStateAction } from 'react';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

export interface RestaurantSetup {
  branchId: string;
  floorId: string;
  floorPlanId: string;
  areaId: string;
  date: string;
  serviceTime: string;
}

export interface ReservationFormState {
  partySize: number;
  durationMinutes: number;
  customerFullName: string;
  customerPhone: string;
  customerEmail: string;
  specialRequests: string;
}

export interface DragState {
  itemKind: 'area' | 'table';
  itemId: string;
  startClientX: number;
  startClientY: number;
}

export const setupStorageKey = 'nexo.restaurant.setup';
export const selectedTableStorageKey = 'nexo.restaurant.selectedTableId';

export const defaultSetup: RestaurantSetup = {
  branchId: '',
  floorId: '',
  floorPlanId: '',
  areaId: '',
  date: todayIsoDate(),
  serviceTime: '18:30',
};

export const defaultReservationForm: ReservationFormState = {
  partySize: 2,
  durationMinutes: 90,
  customerFullName: '',
  customerPhone: '',
  customerEmail: '',
  specialRequests: '',
};

export interface RestaurantWorkspaceStore {
  setup: RestaurantSetup;
  selectedTableId: string | null;
  setSetup: Dispatch<SetStateAction<RestaurantSetup>>;
  patchSetup: (patch: Partial<RestaurantSetup>) => void;
  setSelectedTableId: (tableId: string) => void;
  clearSelectedTableId: () => void;
}

export type RestaurantWorkspaceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createRestaurantWorkspaceStore(
  storage: RestaurantWorkspaceStorage = getBrowserStorage(),
): StoreApi<RestaurantWorkspaceStore> {
  return createStore<RestaurantWorkspaceStore>((set, get) => ({
    setup: readStoredSetup(storage.getItem(setupStorageKey)),
    selectedTableId: readStoredSelectedTableId(storage),
    setSetup: (nextSetup) => {
      const setup = typeof nextSetup === 'function' ? nextSetup(get().setup) : nextSetup;
      persistSetup(storage, setup);
      set({ setup });
    },
    patchSetup: (patch) => {
      const setup = patchRestaurantSetup(get().setup, patch);
      persistSetup(storage, setup);
      set({ setup });
    },
    setSelectedTableId: (tableId) => {
      storeSelectedTableId(tableId, storage);
      set({ selectedTableId: tableId });
    },
    clearSelectedTableId: () => {
      storage.removeItem(selectedTableStorageKey);
      set({ selectedTableId: null });
    },
  }));
}

const noopStorage: RestaurantWorkspaceStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const restaurantWorkspaceStore = createRestaurantWorkspaceStore();

export function useRestaurantWorkspaceStore<T>(selector: (state: RestaurantWorkspaceStore) => T): T {
  return useStore(restaurantWorkspaceStore, selector);
}

export function useStoredSetup(): [RestaurantSetup, Dispatch<SetStateAction<RestaurantSetup>>] {
  const setup = useRestaurantWorkspaceStore((state) => state.setup);
  const setSetup = useRestaurantWorkspaceStore((state) => state.setSetup);

  return [setup, setSetup];
}

export function readStoredSetup(stored: string | null): RestaurantSetup {
  if (!stored) {
    return defaultSetup;
  }

  try {
    return sanitizeSetup({ ...defaultSetup, ...(JSON.parse(stored) as Partial<RestaurantSetup>) });
  } catch {
    return defaultSetup;
  }
}

export function updateSetup(setSetup: Dispatch<SetStateAction<RestaurantSetup>>, patch: Partial<RestaurantSetup>) {
  setSetup((current) => patchRestaurantSetup(current, patch));
}

export function patchRestaurantSetup(current: RestaurantSetup, patch: Partial<RestaurantSetup>): RestaurantSetup {
  return { ...current, ...patch };
}

export function normalizeRestaurantSetupScope(
  setup: RestaurantSetup,
  branches: ReadonlyArray<{ id: string }>,
  floors: ReadonlyArray<{ id: string; branchId: string }>,
): RestaurantSetup {
  const branchId = branches.some((branch) => branch.id === setup.branchId) ? setup.branchId : (branches[0]?.id ?? '');
  const branchFloors = floors.filter((floor) => floor.branchId === branchId);
  const floorId = branchFloors.some((floor) => floor.id === setup.floorId) ? setup.floorId : (branchFloors[0]?.id ?? '');

  if (branchId === setup.branchId && floorId === setup.floorId) {
    return setup;
  }

  return {
    ...setup,
    branchId,
    floorId,
    floorPlanId: '',
    areaId: '',
  };
}

export function combineDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time || '00:00'}:00`).toISOString();
}

export function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isGuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

export function storeSelectedTableId(tableId: string, storage: RestaurantWorkspaceStorage = window.localStorage) {
  storage.setItem(selectedTableStorageKey, tableId);
}

export function readStoredSelectedTableId(storage: RestaurantWorkspaceStorage = window.localStorage) {
  return storage.getItem(selectedTableStorageKey);
}

function persistSetup(storage: RestaurantWorkspaceStorage, setup: RestaurantSetup) {
  storage.setItem(setupStorageKey, JSON.stringify(setup));
}

function getBrowserStorage(): RestaurantWorkspaceStorage {
  return globalThis.localStorage ?? noopStorage;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeSetup(setup: RestaurantSetup): RestaurantSetup {
  return {
    ...setup,
    branchId: sanitizeGuid(setup.branchId),
    floorId: sanitizeGuid(setup.floorId),
    floorPlanId: sanitizeGuid(setup.floorPlanId),
    areaId: sanitizeGuid(setup.areaId),
  };
}

function sanitizeGuid(value: string) {
  const trimmed = value.trim();
  return isGuid(trimmed) ? trimmed : '';
}
