import { useState } from "react";
import { DisasterMap } from "./components/Map/DisasterMap";
import { EventDetailPanel } from "./components/Sidebar/EventDetailPanel";
import { FilterPanel } from "./components/Sidebar/FilterPanel";
import { AnalyticsPanel } from "./components/Sidebar/AnalyticsPanel";
import { useEvents, type EventFilters } from "./hooks/useEvents";
import type { DisasterEvent } from "./types/events";

export default function App() {
  const [selectedEvent, setSelectedEvent] = useState<DisasterEvent | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const [filters, setFilters] = useState<EventFilters>({
    days: 7,
    types: ["earthquake", "wildfire", "volcano", "storm"],  // all four on by default
    minMagnitude: 4.5,
    minWildfireConfidence: "low",
    minVolcanoAlert: "low",
    minStormWindSpeed: 0,
  });

  const { data, isLoading, isError } = useEvents(filters.days, filters.types);

  const filteredEvents = data?.events.filter(event => {
    if (event.type === "earthquake") {
      return (event.magnitude ?? 0) >= filters.minMagnitude;
    }
    if (event.type === "wildfire") {
      const confMap = { low: 1, moderate: 2, high: 3, extreme: 4 };
      const eventConf = confMap[event.severity] ?? 1;
      const filterConf = confMap[filters.minWildfireConfidence] ?? 1;
      return eventConf >= filterConf;
    }
    if (event.type === "volcano") {
      const alertMap = { low: 1, moderate: 2, high: 3, extreme: 4 };
      const eventAlert = alertMap[event.severity] ?? 1;
      const filterAlert = alertMap[filters.minVolcanoAlert] ?? 1;
      return eventAlert >= filterAlert;
    }
    if (event.type === "storm") {
      return (event.magnitude ?? 0) >= filters.minStormWindSpeed;
    }
    return true;
  }) ?? [];

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-red-500 text-xl">⚠</span>
          <h1 className="text-lg font-bold tracking-tight">DisasterWatch</h1>
          <span className="text-xs text-slate-500 font-mono">LIVE</span>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        </div>
        <div className="text-sm text-slate-400">
          {isLoading && "Loading..."}
          {data && `${filteredEvents.length} events`}
          {isError && "Failed to load data"}
        </div>
      </header>

      {/* Filter bar */}
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels(!showLabels)}
        showAnalytics={showAnalytics}
        onToggleAnalytics={() => setShowAnalytics(!showAnalytics)}
        showPlates={showPlates}
        onTogglePlates={() => setShowPlates(!showPlates)}
      />

      {/* Map */}
      <div className="relative flex-1 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-50 text-slate-400">
            Loading events...
          </div>
        )}
        <DisasterMap
          events={filteredEvents}
          selectedEvent={selectedEvent}
          onSelectEvent={setSelectedEvent}
          showLabels={showLabels}
          showPlates={showPlates}
        />
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
        <AnalyticsPanel
          isOpen={showAnalytics}
          events={filteredEvents}
          onClose={() => setShowAnalytics(false)}
          onSelectEvent={setSelectedEvent}
        />
      </div>
    </div>
  );
}