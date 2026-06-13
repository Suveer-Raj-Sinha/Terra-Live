import { CircleMarker, Tooltip } from "react-leaflet";
import type { DisasterEvent } from "../../types/events";

interface Props {
  event: DisasterEvent;
  onClick: (event: DisasterEvent) => void;
  isSelected: boolean;
  showLabels: boolean;
}

const SEVERITY_COLORS = {
  low:      "#22c55e",
  moderate: "#f59e0b",
  high:     "#ef4444",
  extreme:  "#a855f7",
};

const SEVERITY_RADIUS = {
  low: 5, moderate: 8, high: 11, extreme: 15
};

export function EarthquakeMarker({ event, onClick, isSelected, showLabels }: Props) {
  const color = SEVERITY_COLORS[event.severity];
  const radius = SEVERITY_RADIUS[event.severity];

  return (
    <CircleMarker
      center={[event.latitude, event.longitude]}
      radius={isSelected ? radius + 4 : radius}
      pathOptions={{
        color: isSelected ? "#ffffff" : color,
        fillColor: color,
        fillOpacity: 0.75,
        weight: isSelected ? 2 : 1,
      }}
      eventHandlers={{ click: () => onClick(event) }}
    >
      <Tooltip
        permanent={showLabels}
        direction="top"
        className="map-tooltip"
        offset={[0, -radius]}
      >
        <span>M{event.magnitude?.toFixed(1)}</span>
      </Tooltip>
    </CircleMarker>
  );
}