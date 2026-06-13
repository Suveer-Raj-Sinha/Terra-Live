import type { EventFilters } from "../../hooks/useEvents";

interface Props {
  filters: EventFilters;
  onChange: (filters: EventFilters) => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  showAnalytics: boolean;
  onToggleAnalytics: () => void;
}

const DISASTER_TYPES = [
  { value: "earthquake", label: "🌍 Earthquakes" },
  { value: "wildfire",   label: "🔥 Wildfires" },
  { value: "volcano",    label: "🌋 Volcanoes" },
];

export function FilterPanel({
  filters,
  onChange,
  showLabels,
  onToggleLabels,
  showAnalytics,
  onToggleAnalytics,
}: Props) {
  const toggleType = (type: string) => {
    const current = filters.types;
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    if (updated.length === 0) return; // always keep at least one
    onChange({ ...filters, types: updated });
  };

  return (
    <div className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center gap-6 shrink-0">

      {/* Disaster type toggles */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 uppercase tracking-wider mr-1">Type</span>
        {DISASTER_TYPES.map(dt => (
          <button
            key={dt.value}
            onClick={() => toggleType(dt.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
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
        <span className="text-xs text-slate-500 uppercase tracking-wider">Days</span>
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

      {/* Min magnitude (earthquakes only) */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 uppercase tracking-wider">Min Mag</span>
        {[2.5, 4.0, 5.5, 7.0].map(m => (
          <button
            key={m}
            disabled={!filters.types.includes("earthquake")}
            onClick={() => onChange({ ...filters, minMagnitude: m })}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              !filters.types.includes("earthquake")
                ? "opacity-40 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-500"
                : filters.minMagnitude === m
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400"
            }`}
          >
            M{m}
          </button>
        ))}
      </div>

      {/* Toggles on right */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-slate-500 uppercase tracking-wider">Show</span>
        
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
  );
}