import { motion, AnimatePresence } from "framer-motion";
import type { EventFilters } from "../../hooks/useEvents";

interface Props {
  filters: EventFilters;
  onChange: (filters: EventFilters) => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  showAnalytics: boolean;
  onToggleAnalytics: () => void;
  showPlates: boolean;
  onTogglePlates: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const DISASTER_TYPES = [
  { value: "earthquake", label: "🌍 Earthquakes" },
  { value: "wildfire",   label: "🔥 Wildfires" },
  { value: "volcano",    label: "🌋 Volcanoes" },
  { value: "storm",      label: "🌀 Storms" },
];

export function FilterPanel({
  filters,
  onChange,
  showLabels,
  onToggleLabels,
  showAnalytics,
  onToggleAnalytics,
  showPlates,
  onTogglePlates,
  isMobileOpen,
  onMobileClose,
}: Props) {
  const toggleType = (type: string) => {
    const current = filters.types;
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    if (updated.length === 0) return; // always keep at least one
    onChange({ ...filters, types: updated });
  };

  const filterContent = (
    <>
      {/* Top Row: General Filters */}
      <div className="px-3 md:px-6 py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 border-b border-slate-800/80">

        {/* Disaster type toggles */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 -mx-1 px-1">
          <span className="text-xs text-slate-500 uppercase tracking-wider mr-1 shrink-0">Type</span>
          {DISASTER_TYPES.map(dt => (
            <button
              key={dt.value}
              onClick={() => toggleType(dt.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
                filters.types.includes(dt.value)
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400"
              }`}
            >
              {dt.label}
            </button>
          ))}
        </div>

        {/* Days range */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase tracking-wider shrink-0">Days</span>
          {[1, 3, 7, 14].map(d => (
            <button
              key={d}
              onClick={() => onChange({ ...filters, days: d })}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filters.days === d
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>

        {/* Toggles on right */}
        <div className="flex items-center gap-2 md:ml-auto flex-wrap">
          <span className="text-xs text-slate-500 uppercase tracking-wider shrink-0">Show</span>
          
          {/* Toggle Tectonic Plates */}
          <button
            onClick={onTogglePlates}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              showPlates
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400"
            }`}
          >
            🪨 Plates: {showPlates ? "ON" : "OFF"}
          </button>

          {/* Toggle labels */}
          <button
            onClick={onToggleLabels}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              showLabels
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400"
            }`}
          >
            Labels: {showLabels ? "ON" : "OFF"}
          </button>

          {/* Toggle dashboard */}
          <button
            onClick={onToggleAnalytics}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              showAnalytics
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400"
            }`}
          >
            📊 Analytics
          </button>
        </div>
      </div>

      {/* Bottom Row: Dynamic Hazard-Specific Filters */}
      <div className="px-3 md:px-6 py-2 bg-slate-950/40 flex flex-wrap items-center gap-x-4 md:gap-x-8 gap-y-2.5 text-xs">
        
        {/* Earthquakes magnitude filter */}
        {filters.types.includes("earthquake") && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">🌍 Min Mag:</span>
            {[2.5, 4.0, 5.5, 7.0].map(m => (
              <button
                key={m}
                onClick={() => onChange({ ...filters, minMagnitude: m })}
                className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                  filters.minMagnitude === m
                    ? "bg-blue-600 border-blue-500 text-white font-medium"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                M{m}
              </button>
            ))}
          </div>
        )}

        {/* Wildfires confidence filter */}
        {filters.types.includes("wildfire") && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">🔥 Confidence:</span>
            {(["low", "moderate", "high"] as const).map(conf => (
              <button
                key={conf}
                onClick={() => onChange({ ...filters, minWildfireConfidence: conf })}
                className={`px-2 py-0.5 rounded text-[11px] border capitalize transition-colors ${
                  filters.minWildfireConfidence === conf
                    ? "bg-orange-600 border-orange-500 text-white font-medium"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                {conf === "low" ? "Low+" : conf === "moderate" ? "Nominal+" : "High"}
              </button>
            ))}
          </div>
        )}

        {/* Volcanoes alert filter */}
        {filters.types.includes("volcano") && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">🌋 Alert:</span>
            {(["low", "moderate", "high", "extreme"] as const).map(alert => (
              <button
                key={alert}
                onClick={() => onChange({ ...filters, minVolcanoAlert: alert })}
                className={`px-2 py-0.5 rounded text-[11px] border capitalize transition-colors ${
                  filters.minVolcanoAlert === alert
                    ? "bg-purple-600 border-purple-500 text-white font-medium"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                {alert === "low" ? "Normal+" : alert === "moderate" ? "Advisory+" : alert === "high" ? "Watch+" : "Warning"}
              </button>
            ))}
          </div>
        )}

        {/* Storms wind speed filter */}
        {filters.types.includes("storm") && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">🌀 Wind:</span>
            {[0, 119, 178].map(speed => (
              <button
                key={speed}
                onClick={() => onChange({ ...filters, minStormWindSpeed: speed })}
                className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                  filters.minStormWindSpeed === speed
                    ? "bg-cyan-600 border-cyan-500 text-white font-medium"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                {speed === 0 ? "Any" : speed === 119 ? "Cat 1+" : "Cat 3+"}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden md:flex bg-slate-900 border-b border-slate-700 flex-col shrink-0">
        {filterContent}
      </div>

      {/* Mobile: animated overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={onMobileClose}
            />
            {/* Panel */}
            <motion.div
              initial={{ y: "-100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="md:hidden fixed top-[49px] left-0 right-0 z-50 bg-slate-900 border-b border-slate-700 flex flex-col shadow-2xl max-h-[70vh] overflow-y-auto mobile-scroll rounded-b-2xl"
            >
              {filterContent}
              {/* Close button at bottom */}
              <button
                onClick={onMobileClose}
                className="mx-3 mb-3 mt-1 py-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-400 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Apply & Close
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}