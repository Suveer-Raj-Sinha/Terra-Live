import { useQuery } from "@tanstack/react-query";
import { earthquakesApi } from "../api/client";

export function useEarthquakes(days = 7, minMagnitude = 2.5) {
  return useQuery({
    queryKey: ["earthquakes", days, minMagnitude],
    queryFn: () => earthquakesApi.getAll({ days, min_magnitude: minMagnitude }),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
}