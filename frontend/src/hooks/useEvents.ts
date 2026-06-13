import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "../api/client";

export interface EventFilters {
  days: number;
  minMagnitude: number;
  types: string[];
}

export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: ["events", filters],
    queryFn: () =>
      eventsApi.getAll({
        days: filters.days,
        min_magnitude: filters.minMagnitude,
        types: filters.types.join(","),
      }),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
}