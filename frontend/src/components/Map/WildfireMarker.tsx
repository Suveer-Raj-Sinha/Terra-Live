import { Polygon, Tooltip } from "react-leaflet";
import type { DisasterEvent } from "../../types/events";

interface Props {
  event: DisasterEvent;
  onClick: (event: DisasterEvent) => void;
  isSelected: boolean;
  showLabels: boolean;
  zoom: number;
}

const CONFIDENCE_COLORS = {
  low:      "#fdba74",
  moderate: "#f97316",
  high:     "#dc2626",
  extreme:  "#7f1d1d",
};

const getTrianglePoints = (lat: number, lon: number, zoom: number, isSelected: boolean) => {
  // Base size of triangle in screen pixels
  const baseSize = isSelected ? 12 : 7;
  
  // Calculate latitude offset in degrees at this zoom level
  const latOffset = baseSize * (360 / (256 * Math.pow(2, zoom)));
  
  // Calculate longitude offset adjusting for Mercator scaling at this latitude
  const rad = (lat * Math.PI) / 180;
  const cosLat = Math.max(Math.cos(rad), 0.08); // Bound to avoid division by zero near poles
  const lonOffset = latOffset / cosLat;
  
  // Return three points forming an upward pointing triangle centered at (lat, lon)
  return [
    [lat + latOffset * 1.15, lon],                    // top vertex
    [lat - latOffset * 0.85, lon - lonOffset * 0.95], // bottom left
    [lat - latOffset * 0.85, lon + lonOffset * 0.95], // bottom right
  ] as [number, number][];
};

export function WildfireMarker({ event, onClick, isSelected, showLabels, zoom }: Props) {
  const color = CONFIDENCE_COLORS[event.severity] ?? "#f97316";
  const points = getTrianglePoints(event.latitude, event.longitude, zoom, isSelected);

  // Extract the confidence percentage from description if available
  const match = event.description?.match(/Confidence:\s*([\w%]+)/);
  const labelText = match ? `🔥 ${match[1]}` : "🔥 Fire";

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