export const RestaurantReservationStatus = {
  Pending: 0,
  Confirmed: 1,
  Seated: 2,
  Completed: 3,
  Cancelled: 4,
  NoShow: 5,
} as const;

export type RestaurantReservationStatus =
  (typeof RestaurantReservationStatus)[keyof typeof RestaurantReservationStatus];

export const RestaurantReservationSource = {
  Phone: 0,
  WalkIn: 1,
  Website: 2,
  Staff: 3,
  Partner: 4,
  Other: 5,
} as const;

export type RestaurantReservationSource =
  (typeof RestaurantReservationSource)[keyof typeof RestaurantReservationSource];

export const RestaurantTableVisualStatus = {
  Inactive: 0,
  Blocked: 1,
  Occupied: 2,
  Reserved: 3,
  Cleaning: 4,
  Available: 5,
} as const;

export type RestaurantTableVisualStatus =
  (typeof RestaurantTableVisualStatus)[keyof typeof RestaurantTableVisualStatus];

export const RestaurantTableShape = {
  Round: 0,
  Square: 1,
  Rectangle: 2,
  Booth: 3,
  Bar: 4,
  Custom: 5,
} as const;

export type RestaurantTableShape = (typeof RestaurantTableShape)[keyof typeof RestaurantTableShape];

export interface RestaurantContextResponse {
  companyId: string;
  moduleKey: string;
  permissionContracts: string[];
}

export interface RestaurantReservationCustomerDetail {
  customerId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
}

export interface RestaurantReservationTableDetail {
  tableId: string;
  label: string;
}

export interface RestaurantReservationStatusHistoryDetail {
  fromStatus: RestaurantReservationStatus | null;
  toStatus: RestaurantReservationStatus;
  reason: string | null;
  changedAt: string;
}

export interface RestaurantReservationDetail {
  reservationId: string;
  branchId: string;
  partySize: number;
  startAt: string;
  endAt: string;
  turnoverBufferMinutes: number;
  status: RestaurantReservationStatus;
  source: RestaurantReservationSource;
  specialRequests: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  customer: RestaurantReservationCustomerDetail;
  tables: RestaurantReservationTableDetail[];
  statusHistory: RestaurantReservationStatusHistoryDetail[];
}

export interface RestaurantAvailabilityTableOption {
  tableId: string;
  label: string;
  minCapacity: number;
  maxCapacity: number;
  startAt: string;
  endAt: string;
}

export interface RestaurantAvailabilityRejection {
  tableId: string | null;
  code: number;
  message: string;
}

export interface RestaurantAvailabilitySearchResult {
  availableTables: RestaurantAvailabilityTableOption[];
  rejections: RestaurantAvailabilityRejection[];
}

export interface RestaurantFloorPlanSummary {
  id: string;
  branchId: string;
  floorId: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number | null;
  isActive: boolean;
}

export interface RestaurantAreaLayoutDetail {
  areaId: string;
  areaName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDegrees: number;
  zIndex: number;
}

export interface RestaurantTableSeatLayoutDetail {
  seatNumber: number;
  x: number;
  y: number;
  rotationDegrees: number;
}

export interface RestaurantTableLayoutDetail {
  tableId: string;
  tableLabel: string;
  areaId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDegrees: number;
  shape: RestaurantTableShape;
  zIndex: number;
  seatLayouts: RestaurantTableSeatLayoutDetail[];
}

export interface RestaurantFloorPlanDetail extends RestaurantFloorPlanSummary {
  areaLayouts: RestaurantAreaLayoutDetail[];
  tableLayouts: RestaurantTableLayoutDetail[];
}

export interface RestaurantTableStatusDetail {
  tableId: string;
  label: string;
  areaId: string | null;
  status: RestaurantTableVisualStatus;
  reason: string | null;
  reservationId: string | null;
}

export interface RestaurantFloorPlanStatusMap {
  floorPlanId: string;
  at: string;
  tables: RestaurantTableStatusDetail[];
}

export interface RestaurantTableBlockDetail {
  id: string;
  branchId: string;
  floorId: string | null;
  areaId: string | null;
  tableId: string | null;
  startAt: string;
  endAt: string;
  reason: string | null;
  isActive: boolean;
}

export interface RestaurantDashboardMetric {
  key: string;
  label: string;
  value: number;
}

export interface RestaurantOccupancyByHourPoint {
  hour: number;
  reservationCount: number;
  occupiedCovers: number;
  occupancyPercent: number;
}

export interface RestaurantUpcomingReservationSummary {
  reservationId: string;
  startAt: string;
  endAt: string;
  customerName: string;
  partySize: number;
  status: RestaurantReservationStatus;
  tableLabels: string[];
}

export interface RestaurantDashboardSummary {
  branchId: string;
  date: string;
  metrics: RestaurantDashboardMetric[];
  occupancyByHour: RestaurantOccupancyByHourPoint[];
  upcomingReservations: RestaurantUpcomingReservationSummary[];
}

export interface RestaurantOperationErrorResponse {
  code: string;
  message: string;
}
