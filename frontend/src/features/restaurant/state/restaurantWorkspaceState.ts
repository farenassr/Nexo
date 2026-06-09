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
  tableId: string;
  startClientX: number;
  startClientY: number;
}

export const setupStorageKey = 'nexo.restaurant.setup';

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
    return { ...defaultSetup, ...(JSON.parse(stored) as Partial<RestaurantSetup>) };
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

export function combineDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time || '00:00'}:00`).toISOString();
}

export function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
