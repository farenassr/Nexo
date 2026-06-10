import type { QueryClient } from "@tanstack/react-query";
import {
  nexoServerModulesRestaurantFeaturesFloorPlansListListRestaurantFloorPlansEndpointQueryKey,
  nexoServerModulesRestaurantFeaturesReservationsListDailyListRestaurantReservationsEndpointQueryKey,
  nexoServerModulesRestaurantFeaturesSetupGetRestaurantSetupEndpointQueryKey,
} from "../../../lib/api/generated/hooks";

export async function invalidateRestaurantSetup(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey:
        nexoServerModulesRestaurantFeaturesSetupGetRestaurantSetupEndpointQueryKey(),
    }),
    queryClient.invalidateQueries({
      queryKey:
        nexoServerModulesRestaurantFeaturesFloorPlansListListRestaurantFloorPlansEndpointQueryKey(),
    }),
    invalidateGeneratedUrlPrefix(queryClient, "/v1/restaurant/floor-plans/"),
  ]);
}

export async function invalidateRestaurantReservationWork(
  queryClient: QueryClient,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey:
        nexoServerModulesRestaurantFeaturesReservationsListDailyListRestaurantReservationsEndpointQueryKey(),
    }),
    invalidateGeneratedUrlPrefix(queryClient, "/v1/restaurant/tables/"),
    invalidateGeneratedUrlPrefix(queryClient, "/v1/restaurant/floor-plans/"),
  ]);
}

function invalidateGeneratedUrlPrefix(
  queryClient: QueryClient,
  urlPrefix: string,
) {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const [first] = query.queryKey;
      return (
        typeof first === "object" &&
        first !== null &&
        "url" in first &&
        String(first.url).startsWith(urlPrefix)
      );
    },
  });
}
