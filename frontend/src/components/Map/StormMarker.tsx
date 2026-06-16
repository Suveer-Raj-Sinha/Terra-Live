import { Polygon, Tooltip } from "react-leaflet";
import type { DisasterEvent } from "../../types/events";

interface Props {
  event: DisasterEvent;
  onClick: (event: DisasterEvent) => void;
  isSelected: boolean;
  showLabels: boolean;
  zoom: number;
}

const STORM_COLORS: Record<string, string> = {
  low:      "#22c55e",
  moderate: "#f59e0b",
  high:     "#ef4444",
  extreme:  "#a855f7",
};

const getStormPoints = (lat: number, lon: number, zoom: number, isSelected: boolean) => {
  // Base size of storm pinwheel in screen pixels
  const baseSize = isSelected ? 14 : 9;
  
  // Calculate latitude offset in degrees at this zoom level
  const latOffset = baseSize * (360 / (256 * Math.pow(2, zoom)));
  
  // Calculate longitude offset adjusting for Mercator scaling at this latitude
  const rad = (lat * Math.PI) / 180;
  const cosLat = Math.max(Math.cos(rad), 0.08); // Bound to avoid division by zero near poles
  const lonOffset = latOffset / cosLat;
  
  // Return points forming a pinwheel / cyclone S-like symbol
  return [
    [lat - latOffset * 0.2, lon - lonOffset * 0.4], // Inner bottom-left
    [lat + latOffset * 0.9, lon - lonOffset * 1.1], // Top-left outer arm tip
    [lat + latOffset * 0.4, lon - lonOffset * 0.1], // Top-left inner curve
    [lat + latOffset * 0.2, lon + lonOffset * 0.4], // Inner top-right
    [lat - latOffset * 0.9, lon + lonOffset * 1.1], // Bottom-right outer arm tip
    [lat - latOffset * 0.4, lon + lonOffset * 0.1], // Bottom-right inner curve
  ] as [number, number][];
};

export function StormMarker({ event, onClick, isSelected, showLabels, zoom }: Props) {
  const color = STORM_COLORS[event.severity] ?? "#22c55e";
  const points = getStormPoints(event.latitude, event.longitude, zoom, isSelected);

  const windSpeedText = event.magnitude ? ` (${event.magnitude.toFixed(0)} km/h)` : "";
  const labelText = `🌀 ${event.title}${windSpeedText}`;

  return (
    <Polygon
      positions={points}
      pathOptions={{
        color: isSelected ? "#ffffff" : color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: isSelected ? 2 : 1,
      }}
      eventHandlers={{ click: () => onClick(event) }}
    >
      <Tooltip
        permanent={showLabels}
        direction="top"
        className="map-tooltip"
        offset={[0, -5]}
      >
        <span>{labelText}</span>
      </Tooltip>
    </Polygon>
  );
}
