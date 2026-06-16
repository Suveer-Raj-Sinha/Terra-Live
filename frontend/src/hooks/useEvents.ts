import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "../api/client";

export interface EventFilters {
  days: number;
  types: string[];
  minMagnitude: number;
  minWildfireConfidence: "low" | "moderate" | "high";
  minVolcanoAlert: "low" | "moderate" | "high" | "extreme";
  minStormWindSpeed: number;
}

export function useEvents(days: number, types: string[]) {
  return useQuery({
    queryKey: ["events", days, types.join(",")],
    queryFn: () =>
      eventsApi.getAll({
        days,
        min_magnitude: 2.5,
        types: types.join(","),
      }),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
}