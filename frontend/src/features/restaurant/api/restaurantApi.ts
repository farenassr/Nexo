import type {
  RestaurantAvailabilitySearchResult,
  RestaurantAreaDetail,
  RestaurantAreaType,
  RestaurantBranchDetail,
  RestaurantContextResponse,
  RestaurantDashboardSummary,
  RestaurantFloorDetail,
  RestaurantFloorPlanDetail,
  RestaurantFloorPlanStatusMap,
  RestaurantFloorPlanSummary,
  RestaurantOperationErrorResponse,
  RestaurantReservationDetail,
  RestaurantReservationSource,
  RestaurantReservationStatus,
  RestaurantTableShape,
  RestaurantTableBlockDetail,
  RestaurantTableDetail,
  RestaurantSetupSnapshot,
} from '../types';
import { bffFetch } from '../../../lib/api/bffFetch';

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
  serviceTime?: string;
  floorId?: string;
  areaId?: string;
  tableId?: string;
  customerSearch?: string;
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

export interface CreateRestaurantTableBlockInput {
  branchId: string;
  floorId: string | null;
  areaId: string | null;
  tableId: string | null;
  startAt: string;
  endAt: string;
  reason: string | null;
}

export interface CreateRestaurantBranchInput {
  name: string;
  address: string | null;
  timeZone: string;
}

export interface CreateRestaurantFloorInput {
  branchId: string;
  name: string;
  sortOrder: number;
}

export interface CreateRestaurantAreaInput {
  branchId: string;
  floorId: string;
  name: string;
  type: RestaurantAreaType;
  sortOrder: number;
}

export interface CreateRestaurantTableInput {
  branchId: string;
  floorId: string;
  areaId: string | null;
  label: string;
  minCapacity: number;
  maxCapacity: number;
  defaultReservationMinutes: number | null;
  shape: RestaurantTableShape;
}

export interface CreateRestaurantFloorPlanInput {
  branchId: string;
  floorId: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number | null;
  isActive: boolean;
}

export interface GetRestaurantDashboardInput {
  branchId: string;
  date: string;
}

export interface SaveRestaurantFloorPlanInput {
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number | null;
  isActive: boolean;
  areaLayouts: SaveRestaurantAreaLayoutInput[];
  tableLayouts: SaveRestaurantTableLayoutInput[];
}

export interface SaveRestaurantAreaLayoutInput {
  areaId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDegrees: number;
  zIndex: number;
}

export interface SaveRestaurantTableSeatLayoutInput {
  seatNumber: number;
  x: number;
  y: number;
  rotationDegrees: number;
}

export interface SaveRestaurantTableLayoutInput {
  tableId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDegrees: number;
  shape: RestaurantTableShape;
  zIndex: number;
  seatLayouts: SaveRestaurantTableSeatLayoutInput[];
}

export type UpdateRestaurantTableLayoutInput = Omit<SaveRestaurantTableLayoutInput, 'tableId'>;

export async function getRestaurantContext(): Promise<RestaurantContextResponse> {
  return apiFetch('/v1/restaurant/context');
}

export async function getRestaurantDashboard(input: GetRestaurantDashboardInput): Promise<RestaurantDashboardSummary> {
  const search = new URLSearchParams({
    branchId: input.branchId,
    date: input.date,
  });

  return apiFetch(`/v1/restaurant/dashboard?${search.toString()}`);
}

export async function getRestaurantSetup(): Promise<RestaurantSetupSnapshot> {
  return apiFetch('/v1/restaurant/setup');
}

export async function createRestaurantBranch(
  input: CreateRestaurantBranchInput,
): Promise<RestaurantBranchDetail> {
  return apiFetch('/v1/restaurant/setup/branches', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createRestaurantFloor(input: CreateRestaurantFloorInput): Promise<RestaurantFloorDetail> {
  return apiFetch('/v1/restaurant/setup/floors', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createRestaurantArea(input: CreateRestaurantAreaInput): Promise<RestaurantAreaDetail> {
  return apiFetch('/v1/restaurant/setup/areas', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createRestaurantTable(input: CreateRestaurantTableInput): Promise<RestaurantTableDetail> {
  return apiFetch('/v1/restaurant/setup/tables', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createRestaurantFloorPlan(
  input: CreateRestaurantFloorPlanInput,
): Promise<RestaurantFloorPlanSummary> {
  return apiFetch('/v1/restaurant/setup/floor-plans', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteRestaurantBranch(branchId: string): Promise<void> {
  return apiFetch(`/v1/restaurant/setup/branches/${branchId}`, { method: 'DELETE' });
}

export async function deleteRestaurantFloor(floorId: string): Promise<void> {
  return apiFetch(`/v1/restaurant/setup/floors/${floorId}`, { method: 'DELETE' });
}

export async function deleteRestaurantArea(areaId: string): Promise<void> {
  return apiFetch(`/v1/restaurant/setup/areas/${areaId}`, { method: 'DELETE' });
}

export async function deleteRestaurantTable(tableId: string): Promise<void> {
  return apiFetch(`/v1/restaurant/setup/tables/${tableId}`, { method: 'DELETE' });
}

export async function deleteRestaurantFloorPlan(floorPlanId: string): Promise<void> {
  return apiFetch(`/v1/restaurant/setup/floor-plans/${floorPlanId}`, { method: 'DELETE' });
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

export async function listRestaurantTableReservations(
  tableId: string,
  date: string,
): Promise<RestaurantReservationDetail[]> {
  const search = new URLSearchParams({ date });
  return apiFetch(`/v1/restaurant/tables/${tableId}/reservations?${search.toString()}`);
}

export async function createRestaurantTableBlock(
  input: CreateRestaurantTableBlockInput,
): Promise<RestaurantTableBlockDetail> {
  return apiFetch('/v1/restaurant/table-blocks', {
    method: 'POST',
    body: JSON.stringify(input),
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

export async function saveRestaurantFloorPlan(
  floorPlanId: string,
  input: SaveRestaurantFloorPlanInput,
): Promise<RestaurantFloorPlanDetail> {
  return apiFetch(`/v1/restaurant/floor-plans/${floorPlanId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function updateRestaurantTableLayout(
  floorPlanId: string,
  tableId: string,
  input: UpdateRestaurantTableLayoutInput,
): Promise<RestaurantFloorPlanDetail> {
  return apiFetch(`/v1/restaurant/floor-plans/${floorPlanId}/tables/${tableId}/layout`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

async function apiFetch<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  let response: Response;
  try {
    response = await bffFetch(path, {
      method: init.method ?? 'GET',
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new RestaurantApiError('NetworkError', 'No se pudo conectar con el API de restaurante.', 0);
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  try {
    return (await response.json()) as TResponse;
  } catch {
    throw new RestaurantApiError('InvalidResponse', 'La respuesta del API de restaurante no es valida.', response.status);
  }
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
