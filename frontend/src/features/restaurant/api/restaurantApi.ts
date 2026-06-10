import {
  nexoServerModulesRestaurantFeaturesAvailabilitySearchSearchRestaurantAvailabilityEndpoint,
  nexoServerModulesRestaurantFeaturesDashboardGetRestaurantDashboardGetRestaurantDashboardEndpoint,
  nexoServerModulesRestaurantFeaturesFloorPlansGetDetailsGetRestaurantFloorPlanEndpoint,
  nexoServerModulesRestaurantFeaturesFloorPlansListListRestaurantFloorPlansEndpoint,
  nexoServerModulesRestaurantFeaturesFloorPlansSaveSaveRestaurantFloorPlanEndpoint,
  nexoServerModulesRestaurantFeaturesFloorPlansStatusMapGetRestaurantFloorPlanStatusMapEndpoint,
  nexoServerModulesRestaurantFeaturesFloorPlansUpdateTableLayoutUpdateRestaurantTableLayoutEndpoint,
  nexoServerModulesRestaurantFeaturesGetContextRestaurantContextEndpoint,
  nexoServerModulesRestaurantFeaturesReservationsCancelCancelRestaurantReservationEndpoint,
  nexoServerModulesRestaurantFeaturesReservationsCreateCreateRestaurantReservationEndpoint,
  nexoServerModulesRestaurantFeaturesReservationsListByTableListRestaurantTableReservationsEndpoint,
  nexoServerModulesRestaurantFeaturesReservationsListDailyListRestaurantReservationsEndpoint,
  nexoServerModulesRestaurantFeaturesReservationsUpdateStatusUpdateRestaurantReservationStatusEndpoint,
  nexoServerModulesRestaurantFeaturesSetupCreateRestaurantAreaEndpoint,
  nexoServerModulesRestaurantFeaturesSetupCreateRestaurantBranchEndpoint,
  nexoServerModulesRestaurantFeaturesSetupCreateRestaurantFloorEndpoint,
  nexoServerModulesRestaurantFeaturesSetupCreateRestaurantFloorPlanEndpoint,
  nexoServerModulesRestaurantFeaturesSetupCreateRestaurantTableEndpoint,
  nexoServerModulesRestaurantFeaturesSetupDeleteRestaurantAreaEndpoint,
  nexoServerModulesRestaurantFeaturesSetupDeleteRestaurantBranchEndpoint,
  nexoServerModulesRestaurantFeaturesSetupDeleteRestaurantFloorEndpoint,
  nexoServerModulesRestaurantFeaturesSetupDeleteRestaurantFloorPlanEndpoint,
  nexoServerModulesRestaurantFeaturesSetupDeleteRestaurantTableEndpoint,
  nexoServerModulesRestaurantFeaturesSetupGetRestaurantSetupEndpoint,
  nexoServerModulesRestaurantFeaturesTableBlocksCreateCreateRestaurantTableBlockEndpoint,
} from '../../../lib/api/generated/clients';
import { ApiClientError } from '../../../lib/api/generatedClient';
import type {
  CreateRestaurantAreaRequest,
  CreateRestaurantBranchRequest,
  CreateRestaurantFloorPlanRequest,
  CreateRestaurantFloorRequest,
  CreateRestaurantReservationEndpointRequest,
  CreateRestaurantTableBlockEndpointRequest,
  CreateRestaurantTableRequest,
  RestaurantAreaDetail,
  RestaurantAvailabilitySearchResult,
  RestaurantBranchDetail,
  RestaurantContextResponse,
  RestaurantDashboardSummary,
  RestaurantFloorDetail,
  RestaurantFloorPlanDetail,
  RestaurantFloorPlanStatusMap,
  RestaurantFloorPlanSummary,
  RestaurantReservationDetail,
  RestaurantReservationStatus,
  RestaurantSetupSnapshot,
  RestaurantTableBlockDetail,
  RestaurantTableDetail,
  SaveRestaurantFloorPlanEndpointRequest,
  SaveRestaurantAreaLayoutRequest,
  SaveRestaurantTableSeatLayoutRequest,
  UpdateRestaurantTableLayoutEndpointRequest,
} from '../../../lib/api/generated/types';
import type { RestaurantReservationSource, RestaurantTableShape } from '../types';

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

export type CreateRestaurantTableBlockInput = CreateRestaurantTableBlockEndpointRequest;
export type CreateRestaurantBranchInput = CreateRestaurantBranchRequest;
export type CreateRestaurantFloorInput = CreateRestaurantFloorRequest;
export type CreateRestaurantAreaInput = CreateRestaurantAreaRequest;
export type CreateRestaurantTableInput = CreateRestaurantTableRequest;
export type CreateRestaurantFloorPlanInput = CreateRestaurantFloorPlanRequest;

export interface GetRestaurantDashboardInput {
  branchId: string;
  date: string;
}

export type SaveRestaurantFloorPlanInput = Required<
  Pick<
    SaveRestaurantFloorPlanEndpointRequest,
    'name' | 'canvasWidth' | 'canvasHeight' | 'gridSize' | 'isActive' | 'areaLayouts' | 'tableLayouts'
  >
>;

export type SaveRestaurantAreaLayoutInput = SaveRestaurantAreaLayoutRequest;
export type SaveRestaurantTableSeatLayoutInput = SaveRestaurantTableSeatLayoutRequest;

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

export type UpdateRestaurantTableLayoutInput = Required<
  Pick<UpdateRestaurantTableLayoutEndpointRequest, 'x' | 'y' | 'width' | 'height' | 'rotationDegrees' | 'shape' | 'zIndex' | 'seatLayouts'>
>;

export function getRestaurantContext(): Promise<RestaurantContextResponse> {
  return restaurantCall(() => nexoServerModulesRestaurantFeaturesGetContextRestaurantContextEndpoint());
}

export function getRestaurantDashboard(input: GetRestaurantDashboardInput): Promise<RestaurantDashboardSummary> {
  return restaurantCall(() =>
    nexoServerModulesRestaurantFeaturesDashboardGetRestaurantDashboardGetRestaurantDashboardEndpoint({
      params: input,
    }),
  );
}

export function getRestaurantSetup(): Promise<RestaurantSetupSnapshot> {
  return restaurantCall(() => nexoServerModulesRestaurantFeaturesSetupGetRestaurantSetupEndpoint());
}

export function createRestaurantBranch(input: CreateRestaurantBranchInput): Promise<RestaurantBranchDetail> {
  return restaurantCall(() => nexoServerModulesRestaurantFeaturesSetupCreateRestaurantBranchEndpoint({ data: input }));
}

export function createRestaurantFloor(input: CreateRestaurantFloorInput): Promise<RestaurantFloorDetail> {
  return restaurantCall(() => nexoServerModulesRestaurantFeaturesSetupCreateRestaurantFloorEndpoint({ data: input }));
}

export function createRestaurantArea(input: CreateRestaurantAreaInput): Promise<RestaurantAreaDetail> {
  return restaurantCall(() => nexoServerModulesRestaurantFeaturesSetupCreateRestaurantAreaEndpoint({ data: input }));
}

export function createRestaurantTable(input: CreateRestaurantTableInput): Promise<RestaurantTableDetail> {
  return restaurantCall(() => nexoServerModulesRestaurantFeaturesSetupCreateRestaurantTableEndpoint({ data: input }));
}

export function createRestaurantFloorPlan(input: CreateRestaurantFloorPlanInput): Promise<RestaurantFloorPlanSummary> {
  return restaurantCall(() => nexoServerModulesRestaurantFeaturesSetupCreateRestaurantFloorPlanEndpoint({ data: input }));
}

export function deleteRestaurantBranch(branchId: string): Promise<void> {
  return restaurantCall(() => nexoServerModulesRestaurantFeaturesSetupDeleteRestaurantBranchEndpoint({ branchId })).then(toVoid);
}

export function deleteRestaurantFloor(floorId: string): Promise<void> {
  return restaurantCall(() => nexoServerModulesRestaurantFeaturesSetupDeleteRestaurantFloorEndpoint({ floorId })).then(toVoid);
}

export function deleteRestaurantArea(areaId: string): Promise<void> {
  return restaurantCall(() => nexoServerModulesRestaurantFeaturesSetupDeleteRestaurantAreaEndpoint({ areaId })).then(toVoid);
}

export function deleteRestaurantTable(tableId: string): Promise<void> {
  return restaurantCall(() => nexoServerModulesRestaurantFeaturesSetupDeleteRestaurantTableEndpoint({ tableId })).then(toVoid);
}

export function deleteRestaurantFloorPlan(floorPlanId: string): Promise<void> {
  return restaurantCall(() => nexoServerModulesRestaurantFeaturesSetupDeleteRestaurantFloorPlanEndpoint({ floorPlanId })).then(toVoid);
}

export function listRestaurantReservations(input: ListRestaurantReservationsInput): Promise<RestaurantReservationDetail[]> {
  return restaurantCall(() =>
    nexoServerModulesRestaurantFeaturesReservationsListDailyListRestaurantReservationsEndpoint({
      params: {
        branchId: input.branchId,
        date: input.date,
        status: input.status ?? undefined,
      },
    }),
  );
}

export function searchRestaurantAvailability(
  input: SearchRestaurantAvailabilityInput,
): Promise<RestaurantAvailabilitySearchResult> {
  return restaurantCall(() =>
    nexoServerModulesRestaurantFeaturesAvailabilitySearchSearchRestaurantAvailabilityEndpoint({ data: input }),
  );
}

export function createRestaurantReservation(input: CreateRestaurantReservationInput): Promise<RestaurantReservationDetail> {
  return restaurantCall(() =>
    nexoServerModulesRestaurantFeaturesReservationsCreateCreateRestaurantReservationEndpoint({
      data: input as CreateRestaurantReservationEndpointRequest,
    }),
  );
}

export function updateRestaurantReservationStatus(
  input: UpdateRestaurantReservationStatusInput,
): Promise<RestaurantReservationDetail> {
  return restaurantCall(() =>
    nexoServerModulesRestaurantFeaturesReservationsUpdateStatusUpdateRestaurantReservationStatusEndpoint({
      reservationId: input.reservationId,
      data: {
        status: input.status,
        reason: input.reason,
      },
    }),
  );
}

export function cancelRestaurantReservation(
  reservationId: string,
  reason: string | null,
): Promise<RestaurantReservationDetail> {
  return restaurantCall(() =>
    nexoServerModulesRestaurantFeaturesReservationsCancelCancelRestaurantReservationEndpoint({
      reservationId,
      data: { reason },
    }),
  );
}

export function listRestaurantTableReservations(tableId: string, date: string): Promise<RestaurantReservationDetail[]> {
  return restaurantCall(() =>
    nexoServerModulesRestaurantFeaturesReservationsListByTableListRestaurantTableReservationsEndpoint({
      tableId,
      params: { date },
    }),
  );
}

export function createRestaurantTableBlock(input: CreateRestaurantTableBlockInput): Promise<RestaurantTableBlockDetail> {
  return restaurantCall(() => nexoServerModulesRestaurantFeaturesTableBlocksCreateCreateRestaurantTableBlockEndpoint({ data: input }));
}

export function listRestaurantFloorPlans(branchId: string, floorId: string): Promise<RestaurantFloorPlanSummary[]> {
  return restaurantCall(() =>
    nexoServerModulesRestaurantFeaturesFloorPlansListListRestaurantFloorPlansEndpoint({
      params: { branchId, floorId },
    }),
  );
}

export function getRestaurantFloorPlan(floorPlanId: string): Promise<RestaurantFloorPlanDetail> {
  return restaurantCall(() => nexoServerModulesRestaurantFeaturesFloorPlansGetDetailsGetRestaurantFloorPlanEndpoint({ floorPlanId }));
}

export function getRestaurantFloorPlanStatusMap(
  floorPlanId: string,
  at: string,
  areaId: string | null,
): Promise<RestaurantFloorPlanStatusMap> {
  return restaurantCall(() =>
    nexoServerModulesRestaurantFeaturesFloorPlansStatusMapGetRestaurantFloorPlanStatusMapEndpoint({
      floorPlanId,
      params: { at, areaId },
    }),
  );
}

export function saveRestaurantFloorPlan(
  floorPlanId: string,
  input: SaveRestaurantFloorPlanInput,
): Promise<RestaurantFloorPlanDetail> {
  return restaurantCall(() =>
    nexoServerModulesRestaurantFeaturesFloorPlansSaveSaveRestaurantFloorPlanEndpoint({
      floorPlanId,
      data: input,
    }),
  );
}

export function updateRestaurantTableLayout(
  floorPlanId: string,
  tableId: string,
  input: UpdateRestaurantTableLayoutInput,
): Promise<RestaurantFloorPlanDetail> {
  return restaurantCall(() =>
    nexoServerModulesRestaurantFeaturesFloorPlansUpdateTableLayoutUpdateRestaurantTableLayoutEndpoint({
      floorPlanId,
      tableId,
      data: input,
    }),
  );
}

async function restaurantCall<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw new RestaurantApiError(error.code, error.message, error.status);
    }

    throw error;
  }
}

function toVoid() {
  return undefined;
}
