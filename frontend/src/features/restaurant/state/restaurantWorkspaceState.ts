import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

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

export function useStoredSetup(): [RestaurantSetup, Dispatch<SetStateAction<RestaurantSetup>>] {
  const [setup, setSetup] = useState<RestaurantSetup>(() => readStoredSetup(window.localStorage.getItem(setupStorageKey)));

  useEffect(() => {
    window.localStorage.setItem(setupStorageKey, JSON.stringify(setup));
  }, [setup]);

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

export function storeSelectedTableId(tableId: string, storage: Storage = window.localStorage) {
  storage.setItem(selectedTableStorageKey, tableId);
}

export function readStoredSelectedTableId(storage: Storage = window.localStorage) {
  return storage.getItem(selectedTableStorageKey);
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
