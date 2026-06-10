import type {
  RestaurantAreaType as GeneratedRestaurantAreaType,
  RestaurantReservationSource as GeneratedRestaurantReservationSource,
  RestaurantReservationStatus as GeneratedRestaurantReservationStatus,
  RestaurantTableShape as GeneratedRestaurantTableShape,
  RestaurantTableVisualStatus as GeneratedRestaurantTableVisualStatus,
} from "../../lib/api/generated/types";

export type {
  RestaurantAreaDetail,
  RestaurantAreaLayoutDetail,
  RestaurantAvailabilityRejection,
  RestaurantAvailabilitySearchResult,
  RestaurantAvailabilityTableOption,
  RestaurantBranchDetail,
  RestaurantContextResponse,
  RestaurantDashboardMetric,
  RestaurantDashboardSummary,
  RestaurantFloorDetail,
  RestaurantFloorPlanDetail,
  RestaurantFloorPlanStatusMap,
  RestaurantFloorPlanSummary,
  RestaurantOpeningHourDetail,
  RestaurantOccupancyByHourPoint,
  RestaurantReservationCustomerDetail,
  RestaurantReservationDetail,
  RestaurantReservationStatusHistoryDetail,
  RestaurantReservationTableDetail,
  RestaurantSetupSnapshot,
  RestaurantSpecialDayDetail,
  RestaurantTableBlockDetail,
  RestaurantTableDetail,
  RestaurantTableLayoutDetail,
  RestaurantTableSeatLayoutDetail,
  RestaurantTableStatusDetail,
  RestaurantUpcomingReservationSummary,
  DayOfWeek,
} from "../../lib/api/generated/types";

export interface RestaurantOperationErrorResponse {
  code: string;
  message: string;
}

export const RestaurantReservationStatus = {
  Pending: 0,
  Confirmed: 1,
  Seated: 2,
  Completed: 3,
  Cancelled: 4,
  NoShow: 5,
} as const;
export type RestaurantReservationStatus = GeneratedRestaurantReservationStatus;

export const RestaurantReservationSource = {
  Phone: 0,
  WalkIn: 1,
  Website: 2,
  Staff: 3,
  Partner: 4,
  Other: 5,
} as const;
export type RestaurantReservationSource = GeneratedRestaurantReservationSource;

export const RestaurantTableVisualStatus = {
  Inactive: 0,
  Blocked: 1,
  Occupied: 2,
  Reserved: 3,
  Cleaning: 4,
  Available: 5,
} as const;
export type RestaurantTableVisualStatus = GeneratedRestaurantTableVisualStatus;

export const RestaurantTableShape = {
  Round: 0,
  Square: 1,
  Rectangle: 2,
  Booth: 3,
  Bar: 4,
  Custom: 5,
} as const;
export type RestaurantTableShape = GeneratedRestaurantTableShape;

export const RestaurantAreaType = {
  DiningRoom: 0,
  Terrace: 1,
  Bar: 2,
  PrivateRoom: 3,
  Outdoor: 4,
  Takeaway: 5,
  Other: 6,
} as const;
export type RestaurantAreaType = GeneratedRestaurantAreaType;
