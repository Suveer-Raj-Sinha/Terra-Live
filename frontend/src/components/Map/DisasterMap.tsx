import { useState, useEffect } from "react";
import { MapContainer, TileLayer, ZoomControl, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { DisasterEvent } from "../../types/events";
import { EarthquakeMarker } from "./EarthquakeMarker";
import { WildfireMarker } from "./WildfireMarker";
import { VolcanoMarker } from "./VolcanoMarker";

interface Props {
  events: DisasterEvent[];
  selectedEvent: DisasterEvent | null;
  onSelectEvent: (event: DisasterEvent) => void;
  showLabels: boolean;
}

function ZoomListener({ onChange }: { onChange: (zoom: number) => void }) {
  useMapEvents({
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
      // If we are zoomed out, fly to the event and zoom in to level 6.
      // If we are already zoomed in (level >= 6), pan to the event and maintain the zoom level.
      const targetZoom = currentZoom < 6 ? 6 : currentZoom;
      map.flyTo([selectedEvent.latitude, selectedEvent.longitude], targetZoom, {
        duration: 1.2,
        easeLinearity: 0.2,
      });
    }
  }, [selectedEvent, map]);

  return null;
}

export function DisasterMap({ events, selectedEvent, onSelectEvent, showLabels }: Props) {
  const [zoom, setZoom] = useState(2);

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

        {events.map(event => {
          const isSelected = selectedEvent?.id === event.id;
          // Only show labels when zoom is zoomed-in (>= 5), OR the event is critical (high/extreme severity), OR it is currently selected.
          const labelVisible = showLabels && (
            zoom >= 5 ||
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
                zoom={zoom}
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
                zoom={zoom}
              />
            );
          }
          return null;
        })}
      </MapContainer>

      {/* Legend Overlay */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-4 shadow-2xl text-xs space-y-3 pointer-events-none select-none">
        <h3 className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">Legend</h3>
        
        {/* Disaster Types */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-slate-500 uppercase font-semibold">Event Types</p>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="inline-block w-3 h-3 rounded-full border border-slate-400 bg-blue-500/80"></span>
            <span>Earthquake (Circle)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="inline-block w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-orange-500"></span>
            <span>Wildfire (Triangle)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <svg width="12" height="12" viewBox="0 0 14 14" className="inline-block ml-[2px] mr-[2px]">
              <path d="M 1,12 L 5,3 L 7,6 L 9,3 L 13,12 Z" fill="#22c55e" fillOpacity="0.8" stroke="#94a3b8" strokeWidth="1" />
            </svg>
            <span>Volcano (Crater)</span>
          </div>
        </div>
        
        {/* Severity levels */}
        <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase font-semibold">Severity / Alert Level</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Low / Normal</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span>Mod. / Advisory</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span>High / Watch</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-magenta-500" style={{ backgroundColor: "#d946ef" }}></span>
              <span>Ext. / Warning</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}