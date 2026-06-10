import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useNexoServerModulesRestaurantFeaturesAvailabilitySearchSearchRestaurantAvailabilityEndpoint,
  useNexoServerModulesRestaurantFeaturesReservationsCreateCreateRestaurantReservationEndpoint,
} from "../../../../lib/api/generated/hooks";
import type { CreateRestaurantReservationEndpointRequest } from "../../../../lib/api/generated/types";
import { invalidateRestaurantReservationWork } from "../../api/restaurantQueryInvalidation";
import labels from "../../labels.es.json";
import { canSubmitReservationModal } from "../../reservationFilters";
import {
  combineDateAndTime,
  defaultReservationForm,
  isGuid,
  optionalText,
  type RestaurantSetup,
} from "../../state/restaurantWorkspaceState";
import {
  RestaurantReservationSource,
  type RestaurantAvailabilitySearchResult,
  type RestaurantAvailabilityTableOption,
} from "../../types";
import { ReservationCreatePanel } from "../ReservationCreatePanel";

export function CreateReservationModal({
  open,
  setup,
  initialTable,
  onClose,
}: {
  open: boolean;
  setup: RestaurantSetup;
  initialTable?: RestaurantAvailabilityTableOption | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [reservationForm, setReservationForm] = useState(
    defaultReservationForm,
  );
  const [availabilityResult, setAvailabilityResult] =
    useState<RestaurantAvailabilitySearchResult | null>(null);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const serviceInstant = useMemo(
    () => combineDateAndTime(setup.date, setup.serviceTime),
    [setup.date, setup.serviceTime],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setReservationForm(defaultReservationForm);
    setAvailabilityResult(
      initialTable
        ? {
            availableTables: [initialTable],
            rejections: [],
          }
        : null,
    );
    setSelectedTableIds(initialTable ? [initialTable.tableId] : []);
  }, [initialTable, open]);

  const availabilityMutation =
    useNexoServerModulesRestaurantFeaturesAvailabilitySearchSearchRestaurantAvailabilityEndpoint(
      {
        mutation: {
          onSuccess: (result) => {
            setAvailabilityResult(result);
            const firstOption = result.availableTables[0];
            setSelectedTableIds(firstOption ? [firstOption.tableId] : []);
          },
          onError: (error) =>
            showMutationError(error, labels.toasts.availabilityFailed),
        },
      },
    );

  const createReservationMutation =
    useNexoServerModulesRestaurantFeaturesReservationsCreateCreateRestaurantReservationEndpoint(
      {
        mutation: {
          onSuccess: async () => {
            toast.success(labels.toasts.created);
            await invalidateRestaurantReservationWork(queryClient);
            onClose();
          },
          onError: (error) =>
            showMutationError(error, labels.toasts.createFailed),
        },
      },
    );

  const selectedTableLabels = selectedTableIds
    .map(
      (tableId) =>
        availabilityResult?.availableTables.find(
          (table) => table.tableId === tableId,
        )?.label ?? tableId,
    )
    .join(", ");
  const canSearchAvailability =
    isGuid(setup.branchId) &&
    reservationForm.partySize > 0 &&
    Boolean(setup.date && setup.serviceTime);
  const canCreateReservation = canSubmitReservationModal({
    branchId: setup.branchId,
    date: setup.date,
    serviceTime: setup.serviceTime,
    partySize: reservationForm.partySize,
    customerFullName: reservationForm.customerFullName,
    selectedTableIds,
  });

  function handleAvailabilitySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSearchAvailability) {
      return;
    }

    availabilityMutation.mutate({
      data: {
        branchId: setup.branchId,
        partySize: reservationForm.partySize,
        startAt: serviceInstant,
        durationMinutes: reservationForm.durationMinutes || null,
      },
    });
  }

  function handleCreateReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateReservation) {
      return;
    }

    const payload: CreateRestaurantReservationEndpointRequest = {
      branchId: setup.branchId,
      tableIds: selectedTableIds,
      partySize: reservationForm.partySize,
      startAt: serviceInstant,
      durationMinutes: reservationForm.durationMinutes || null,
      customerFullName: reservationForm.customerFullName.trim(),
      customerPhone: optionalText(reservationForm.customerPhone),
      customerEmail: optionalText(reservationForm.customerEmail),
      source: RestaurantReservationSource.Staff,
      specialRequests: optionalText(reservationForm.specialRequests),
    };

    createReservationMutation.mutate({ data: payload });
  }

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="reservation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-reservation-heading"
      >
        <header className="modal-header">
          <div>
            <span className="eyebrow">{labels.sections.booking}</span>
            <h2 id="create-reservation-heading">{labels.actions.create}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={labels.actions.close}
            onClick={onClose}
            disabled={createReservationMutation.isPending}
          >
            <X size={16} />
          </button>
        </header>
        <ReservationCreatePanel
          reservationForm={reservationForm}
          availabilityResult={availabilityResult}
          selectedTableIds={selectedTableIds}
          selectedTableLabels={selectedTableLabels}
          canSearchAvailability={canSearchAvailability}
          canCreateReservation={canCreateReservation}
          isSearchingAvailability={availabilityMutation.isPending}
          isCreatingReservation={createReservationMutation.isPending}
          setReservationForm={setReservationForm}
          setSelectedTableIds={setSelectedTableIds}
          onAvailabilitySearch={handleAvailabilitySearch}
          onCreateReservation={handleCreateReservation}
        />
      </section>
    </div>
  );
}

function showMutationError(error: unknown, title: string) {
  if (error instanceof Error) {
    toast.error(title, { description: error.message });
    return;
  }

  toast.error(title);
}
