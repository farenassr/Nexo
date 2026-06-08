import type {
  RestaurantAvailabilitySearchResult,
  RestaurantContextResponse,
  RestaurantFloorPlanDetail,
  RestaurantFloorPlanStatusMap,
  RestaurantFloorPlanSummary,
  RestaurantOperationErrorResponse,
  RestaurantReservationDetail,
  RestaurantReservationSource,
  RestaurantReservationStatus,
} from '../types';

export class RestaurantApiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'RestaurantApiError';
  }
}

export interface ListRestaurantReservationsInput {
  branchId: string;
  date: string;
  status: RestaurantReservationStatus | null;
}

export interface SearchRestaurantAvailabilityInput {
  branchId: string;
  partySize: number;
  startAt: string;
  durationMinutes: number | null;
}

export interface CreateRestaurantReservationInput extends SearchRestaurantAvailabilityInput {
  tableIds: string[];
  customerFullName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  source: RestaurantReservationSource;
  specialRequests: string | null;
}

export interface UpdateRestaurantReservationStatusInput {
  reservationId: string;
  status: RestaurantReservationStatus;
  reason: string | null;
}

export async function getRestaurantContext(): Promise<RestaurantContextResponse> {
  return apiFetch('/v1/restaurant/context');
}

export async function listRestaurantReservations(
  input: ListRestaurantReservationsInput,
): Promise<RestaurantReservationDetail[]> {
  const search = new URLSearchParams({
    branchId: input.branchId,
    date: input.date,
  });
  if (input.status !== null) {
    search.set('status', String(input.status));
  }

  return apiFetch(`/v1/restaurant/reservations?${search.toString()}`);
}

export async function searchRestaurantAvailability(
  input: SearchRestaurantAvailabilityInput,
): Promise<RestaurantAvailabilitySearchResult> {
  return apiFetch('/v1/restaurant/availability/search', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createRestaurantReservation(
  input: CreateRestaurantReservationInput,
): Promise<RestaurantReservationDetail> {
  return apiFetch('/v1/restaurant/reservations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateRestaurantReservationStatus(
  input: UpdateRestaurantReservationStatusInput,
): Promise<RestaurantReservationDetail> {
  return apiFetch(`/v1/restaurant/reservations/${input.reservationId}/status`, {
    method: 'PUT',
    body: JSON.stringify({
      status: input.status,
      reason: input.reason,
    }),
  });
}

export async function cancelRestaurantReservation(
  reservationId: string,
  reason: string | null,
): Promise<RestaurantReservationDetail> {
  return apiFetch(`/v1/restaurant/reservations/${reservationId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function listRestaurantFloorPlans(
  branchId: string,
  floorId: string,
): Promise<RestaurantFloorPlanSummary[]> {
  const search = new URLSearchParams({ branchId, floorId });
  return apiFetch(`/v1/restaurant/floor-plans?${search.toString()}`);
}

export async function getRestaurantFloorPlan(floorPlanId: string): Promise<RestaurantFloorPlanDetail> {
  return apiFetch(`/v1/restaurant/floor-plans/${floorPlanId}`);
}

export async function getRestaurantFloorPlanStatusMap(
  floorPlanId: string,
  at: string,
  areaId: string | null,
): Promise<RestaurantFloorPlanStatusMap> {
  const search = new URLSearchParams({ at });
  if (areaId) {
    search.set('areaId', areaId);
  }

  return apiFetch(`/v1/restaurant/floor-plans/${floorPlanId}/status-map?${search.toString()}`);
}

async function apiFetch<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  const response = await fetch(path, {
    method: init.method ?? 'GET',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}

async function toApiError(response: Response): Promise<RestaurantApiError> {
  const fallback = new RestaurantApiError(
    `Http${response.status}`,
    response.statusText || 'Restaurant request failed.',
    response.status,
  );

  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    return fallback;
  }

  try {
    const payload = (await response.json()) as Partial<RestaurantOperationErrorResponse>;
    return new RestaurantApiError(
      payload.code || fallback.code,
      payload.message || fallback.message,
      response.status,
    );
  } catch {
    return fallback;
  }
}
