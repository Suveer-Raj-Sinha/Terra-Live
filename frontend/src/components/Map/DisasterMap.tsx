import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, ZoomControl, useMapEvents, useMap, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { DisasterEvent } from "../../types/events";
import { EarthquakeMarker } from "./EarthquakeMarker";
import { WildfireMarker } from "./WildfireMarker";
import { VolcanoMarker } from "./VolcanoMarker";
import { StormMarker } from "./StormMarker";
import { HeatmapLayer } from "./HeatmapLayer";

interface Props {
  events: DisasterEvent[];
  selectedEvent: DisasterEvent | null;
  onSelectEvent: (event: DisasterEvent) => void;
  showLabels: boolean;
  showPlates: boolean;
}

const HEATMAP_ZOOM_THRESHOLD = 5;

function ZoomListener({ onChange }: { onChange: (zoom: number) => void }) {
  useMapEvents({
    zoom: (e) => {
      onChange(e.target.getZoom());
    },
    zoomend: (e) => {
      onChange(e.target.getZoom());
    },
  });
  return null;
}

function MapViewController({ selectedEvent }: { selectedEvent: DisasterEvent | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedEvent) {
      const currentZoom = map.getZoom();
      const targetZoom = currentZoom < 6 ? 6 : currentZoom;
      map.flyTo([selectedEvent.latitude, selectedEvent.longitude], targetZoom, {
        duration: 1.2,
        easeLinearity: 0.2,
      });
    }
  }, [selectedEvent, map]);

  return null;
}

export function DisasterMap({ events, selectedEvent, onSelectEvent, showLabels, showPlates }: Props) {
  const [zoom, setZoom] = useState(2);
  const [debouncedZoom, setDebouncedZoom] = useState(2);
  const [platesData, setPlatesData] = useState<any>(null);
  const zoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/pb2002_boundaries.json")
      .then(res => res.json())
      .then(data => setPlatesData(data))
      .catch(err => console.error("Failed to load plate boundaries:", err));
  }, []);

  useEffect(() => {
    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    zoomTimerRef.current = setTimeout(() => {
      setDebouncedZoom(zoom);
    }, 150);

    return () => {
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    };
  }, [zoom]);

  const showHeatmap = debouncedZoom < HEATMAP_ZOOM_THRESHOLD;
  const showMarkers = debouncedZoom >= HEATMAP_ZOOM_THRESHOLD;

  const earthquakeEvents = events.filter(e => e.type === "earthquake");
  const wildfireEvents = events.filter(e => e.type === "wildfire");
  const volcanoEvents = events.filter(e => e.type === "volcano");
  const stormEvents = events.filter(e => e.type === "storm");

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        zoomControl={false}
        worldCopyJump={true}
        minZoom={2}
        maxBounds={[[-85, -360], [85, 360]]}
        maxBoundsViscosity={1.0}
        className="w-full h-full"
        style={{ background: "#0f172a" }}
        preferCanvas={true}
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={90}
        inertia={true}
        inertiaDeceleration={2000}
      >
        <ZoomListener onChange={setZoom} />
        <MapViewController selectedEvent={selectedEvent} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
          maxZoom={19}
        />
        <ZoomControl position="bottomright" />

        {/* Tectonic Plates Overlay */}
        {showPlates && platesData && (
          <GeoJSON
            data={platesData}
            style={{
              color: "#ea580c", // Subtle orange
              weight: 1.5,
              dashArray: "4, 4",
              opacity: 0.7,
            }}
          />
        )}

        {/* Heatmap layers */}
        {earthquakeEvents.length > 0 && (
          <HeatmapLayer
            events={earthquakeEvents}
            type="earthquake"
            visible={showHeatmap}
          />
        )}
        {wildfireEvents.length > 0 && (
          <HeatmapLayer
            events={wildfireEvents}
            type="wildfire"
            visible={showHeatmap}
          />
        )}
        {volcanoEvents.length > 0 && (
          <HeatmapLayer
            events={volcanoEvents}
            type="volcano"
            visible={showHeatmap}
          />
        )}
        {stormEvents.length > 0 && (
          <HeatmapLayer
            events={stormEvents}
            type="storm"
            visible={showHeatmap}
          />
        )}

        {/* Individual markers */}
        {showMarkers && events.map(event => {
          const isSelected = selectedEvent?.id === event.id;
          const labelVisible = showLabels && (
            debouncedZoom >= 5 ||
            event.severity === "high" ||
            event.severity === "extreme" ||
            isSelected
          );

          if (event.type === "earthquake") {
            return (
              <EarthquakeMarker
                key={event.id}
                event={event}
                isSelected={isSelected}
                onClick={onSelectEvent}
                showLabels={labelVisible}
              />
            );
          }
          if (event.type === "wildfire") {
            return (
              <WildfireMarker
                key={event.id}
                event={event}
                isSelected={isSelected}
                onClick={onSelectEvent}
                showLabels={labelVisible}
                zoom={debouncedZoom}
              />
            );
          }
          if (event.type === "volcano") {
            return (
              <VolcanoMarker
                key={event.id}
                event={event}
                isSelected={isSelected}
                onClick={onSelectEvent}
                showLabels={labelVisible}
                zoom={debouncedZoom}
              />
            );
          }
          if (event.type === "storm") {
            return (
              <StormMarker
                key={event.id}
                event={event}
                isSelected={isSelected}
                onClick={onSelectEvent}
                showLabels={labelVisible}
                zoom={debouncedZoom}
              />
            );
          }
          return null;
        })}
      </MapContainer>

      {/* Zoom hint */}
      {showHeatmap && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-full px-4 py-1.5 text-xs text-slate-400 pointer-events-none">
          Zoom in to see individual events
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-4 shadow-2xl text-xs space-y-3 pointer-events-none select-none">
        <h3 className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">Legend</h3>

        {showHeatmap ? (
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Heatmap Mode</p>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "linear-gradient(to right, #1d4ed8, #a78bfa)" }}></span>
              <span>Earthquakes</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "linear-gradient(to right, #ea580c, #fbbf24)" }}></span>
              <span>Wildfires</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "linear-gradient(to right, #7c3aed, #f0abfc)" }}></span>
              <span>Volcanoes</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "linear-gradient(to right, #0284c7, #22d3ee)" }}></span>
              <span>Storms</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Event Types</p>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500/80"></span>
              <span>Earthquake</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="inline-block w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-orange-500"></span>
              <span>Wildfire</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <svg width="12" height="12" viewBox="0 0 14 14" className="inline-block">
                <path d="M 1,12 L 5,3 L 7,6 L 9,3 L 13,12 Z" fill="#22c55e" fillOpacity="0.8" stroke="#94a3b8" strokeWidth="1" />
              </svg>
              <span>Volcano</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="inline-block w-3 h-3 text-center leading-3 font-semibold text-cyan-400 select-none">🌀</span>
              <span>Storm</span>
            </div>
            
            {showPlates && (
              <div className="flex items-center gap-2 text-slate-300 pt-1.5 border-t border-slate-800">
                <span className="inline-block w-4 h-0 border-t border-dashed border-orange-500"></span>
                <span>Plate Boundaries</span>
              </div>
            )}

            <div className="space-y-1 pt-1.5 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Severity</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>Low</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  <span>Moderate</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span>High</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#d946ef" }}></span>
                  <span>Extreme</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}