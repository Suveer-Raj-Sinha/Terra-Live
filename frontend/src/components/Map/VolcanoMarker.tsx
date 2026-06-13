import { Polygon, Tooltip } from "react-leaflet";
import type { DisasterEvent } from "../../types/events";

interface Props {
  event: DisasterEvent;
  onClick: (event: DisasterEvent) => void;
  isSelected: boolean;
  showLabels: boolean;
  zoom: number;
}

const VOLCANO_COLORS: Record<string, string> = {
  low:      "#22c55e", // Normal/Unassigned - Green
  moderate: "#eab308", // Advisory - Yellow
  high:     "#f97316", // Watch - Orange
  extreme:  "#d946ef", // Warning - Magenta/Pink
};

const getVolcanoPoints = (lat: number, lon: number, zoom: number, isSelected: boolean) => {
  // Base size of volcano in screen pixels
  const baseSize = isSelected ? 12 : 7;
  
  // Calculate latitude offset in degrees at this zoom level
  const latOffset = baseSize * (360 / (256 * Math.pow(2, zoom)));
  
  // Calculate longitude offset adjusting for Mercator scaling at this latitude
  const rad = (lat * Math.PI) / 180;
  const cosLat = Math.max(Math.cos(rad), 0.08); // Bound to avoid division by zero near poles
  const lonOffset = latOffset / cosLat;
  
  // Return five points forming a volcano cone with a crater at the top
  return [
    [lat - latOffset * 0.9, lon - lonOffset * 1.1],  // bottom-left
    [lat + latOffset * 0.8, lon - lonOffset * 0.35], // top-left crater lip
    [lat + latOffset * 0.3, lon],                    // crater center dip
    [lat + latOffset * 0.8, lon + lonOffset * 0.35], // top-right crater lip
    [lat - latOffset * 0.9, lon + lonOffset * 1.1],  // bottom-right
  ] as [number, number][];
};

export function VolcanoMarker({ event, onClick, isSelected, showLabels, zoom }: Props) {
  const color = VOLCANO_COLORS[event.severity] ?? "#22c55e";
  const points = getVolcanoPoints(event.latitude, event.longitude, zoom, isSelected);

  // Label text, e.g. "🌋 St. Helens" or status
  const labelText = `🌋 ${event.title}`;

  return (
    <Polygon
      positions={points}
      pathOptions={{
        color: isSelected ? "#ffffff" : color,
        fillColor: color,
        fillOpacity: 0.85,
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
