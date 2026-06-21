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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
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
    <div className="fixed inset-0 flex flex-col bg-slate-950 text-white">

      {/* Header */}
      <header className="flex items-center justify-between px-3 md:px-6 py-3 bg-slate-900 border-b border-slate-700 z-10 shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="md:hidden flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors"
            aria-label="Toggle filters"
          >
            <span className={`block w-4 h-0.5 bg-slate-300 rounded transition-all duration-200 ${showMobileFilters ? "rotate-45 translate-y-[3px]" : ""}`} />
            <span className={`block w-4 h-0.5 bg-slate-300 rounded mt-1 transition-all duration-200 ${showMobileFilters ? "opacity-0" : ""}`} />
            <span className={`block w-4 h-0.5 bg-slate-300 rounded mt-1 transition-all duration-200 ${showMobileFilters ? "-rotate-45 -translate-y-[3px]" : ""}`} />
          </button>

          <svg className="w-5 h-5 md:w-6 md:h-6 text-sky-400 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.36 10.04a6 6 0 0 0-11.33-1.6 5 5 0 0 0-6 4.96 5 5 0 0 0 5 5h12a4.5 4.5 0 0 0 4.5-4.5 4.5 4.5 0 0 0-4.17-3.86z"/>
          </svg>
          <h1 className="text-base md:text-lg font-bold tracking-tight">Terra Live</h1>
          <span className="text-xs text-slate-500 font-mono hidden md:inline">LIVE</span>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        </div>
        <div className="text-xs md:text-sm text-slate-400">
          {isLoading && "Loading..."}
          {data && <><span className="hidden md:inline">{filteredEvents.length} events</span><span className="md:hidden">{filteredEvents.length}</span></>}
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
        isMobileOpen={showMobileFilters}
        onMobileClose={() => setShowMobileFilters(false)}
      />

      {/* Map */}
      <div className="relative flex-1 overflow-hidden z-0">
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