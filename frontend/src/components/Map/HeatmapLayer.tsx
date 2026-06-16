import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import type { DisasterEvent } from "../../types/events";

interface Props {
  events: DisasterEvent[];
  type: "earthquake" | "wildfire" | "volcano" | "storm";
  visible: boolean;
}

const SEVERITY_WEIGHT: Record<string, number> = {
  low:      0.2,
  moderate: 0.4,
  high:     0.7,
  extreme:  1.0,
};

const TYPE_GRADIENTS = {
  earthquake: {
    0.0: "#0f172a",
    0.3: "#1d4ed8",
    0.6: "#6366f1",
    0.8: "#a78bfa",
    1.0: "#e879f9",
  },
  wildfire: {
    0.0: "#431407",
    0.3: "#ea580c",
    0.6: "#f97316",
    0.8: "#fbbf24",
    1.0: "#fef08a",
  },
  volcano: {
    0.0: "#1a0a2e",
    0.3: "#7c3aed",
    0.6: "#c026d3",
    0.8: "#f0abfc",
    1.0: "#ffffff",
  },
  storm: {
    0.0: "#082f49",
    0.3: "#0284c7",
    0.6: "#06b6d4",
    0.8: "#22d3ee",
    1.0: "#ffffff",
  },
};

const TYPE_OPTIONS = {
  earthquake: { radius: 30, blur: 25, minOpacity: 0.5 },
  wildfire:   { radius: 20, blur: 15, minOpacity: 0.45 },
  volcano:    { radius: 18, blur: 12, minOpacity: 0.35 },
  storm:      { radius: 25, blur: 20, minOpacity: 0.4 },
};

export function HeatmapLayer({ events, type, visible }: Props) {
  const map = useMap();
  const heatRef = useRef<L.Layer | null>(null);
  const addedRef = useRef(false);

  // Create heatmap layer once when events change
  useEffect(() => {
    const points = events
      .filter(e => e.type === type)
      .map(e => [
        e.latitude,
        e.longitude,
        SEVERITY_WEIGHT[e.severity] ?? 0.3,
      ] as [number, number, number]);

    // Remove old layer
    if (heatRef.current && addedRef.current) {
      map.removeLayer(heatRef.current);
      addedRef.current = false;
    }

    if (points.length === 0) {
      heatRef.current = null;
      return;
    }

    // @ts-ignore
    const heat = L.heatLayer(points, {
      minOpacity: TYPE_OPTIONS[type].minOpacity,
      radius: TYPE_OPTIONS[type].radius,
      blur: TYPE_OPTIONS[type].blur,
      max: 1.0,
      gradient: TYPE_GRADIENTS[type],
    });

    heatRef.current = heat;

    // Only add to map if currently visible
    if (visible) {
      heat.addTo(map);
      addedRef.current = true;
    }

    return () => {
      if (heatRef.current && addedRef.current) {
        map.removeLayer(heatRef.current);
        addedRef.current = false;
      }
    };
  }, [events, type, map]);

  // Handle visibility toggle separately — no layer recreation
  useEffect(() => {
    if (!heatRef.current) return;

    if (visible && !addedRef.current) {
      heatRef.current.addTo(map);
      addedRef.current = true;
    } else if (!visible && addedRef.current) {
      map.removeLayer(heatRef.current);
      addedRef.current = false;
    }
  }, [visible, map]);

  return null;
}