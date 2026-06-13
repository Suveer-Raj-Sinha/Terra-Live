import { motion, AnimatePresence } from "framer-motion";
import type { DisasterEvent } from "../../types/events";

interface Props {
  isOpen: boolean;
  events: DisasterEvent[];
  onClose: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-green-500",
  moderate: "bg-yellow-500",
  high: "bg-orange-500",
  extreme: "bg-magenta-500",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Low / Normal",
  moderate: "Moderate / Advisory",
  high: "High / Watch",
  extreme: "Extreme / Warning",
};

export function AnalyticsPanel({ isOpen, events, onClose }: Props) {
  const totalCount = events.length;
  const quakes = events.filter((e) => e.type === "earthquake");
  const fires = events.filter((e) => e.type === "wildfire");
  const volcs = events.filter((e) => e.type === "volcano");

  // Severity counts
  const severityCounts = {
    low: events.filter((e) => e.severity === "low").length,
    moderate: events.filter((e) => e.severity === "moderate").length,
    high: events.filter((e) => e.severity === "high").length,
    extreme: events.filter((e) => e.severity === "extreme").length,
  };

  // Earthquake ranges
  const magRanges = {
    "2.5-4.0": quakes.filter((e) => typeof e.magnitude === "number" && e.magnitude >= 2.5 && e.magnitude < 4.0).length,
    "4.0-5.5": quakes.filter((e) => typeof e.magnitude === "number" && e.magnitude >= 4.0 && e.magnitude < 5.5).length,
    "5.5-7.0": quakes.filter((e) => typeof e.magnitude === "number" && e.magnitude >= 5.5 && e.magnitude < 7.0).length,
    "7.0+": quakes.filter((e) => typeof e.magnitude === "number" && e.magnitude >= 7.0).length,
  };

  // Volcano lists
  const activeVolcanoes = volcs
    .filter((v) => v.severity !== "low")
    .slice(0, 10); // Show up to 10 active volcanoes

  // Calculate percentages helper
  const getPct = (val: number) => (totalCount > 0 ? (val / totalCount) * 100 : 0);

  // SVG Chart sizing
  const maxMagVal = Math.max(...Object.values(magRanges), 1);
  const chartWidth = 320;
  const chartHeight = 130;
  const barWidth = 45;
  const spacing = 25;
  const paddingLeft = 30;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute left-0 top-0 h-full w-96 bg-slate-900 border-r border-slate-700 z-[1000] overflow-y-auto shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
            <div className="flex items-center gap-2">
              <span className="text-blue-500 text-lg">📊</span>
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Analytics Dashboard
              </h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
          </div>

          <div className="p-4 space-y-6 flex-1">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Events" value={totalCount} icon="🌍" color="text-blue-400" />
              <StatCard label="Earthquakes" value={quakes.length} icon="⭕" color="text-blue-500" />
              <StatCard label="Wildfires" value={fires.length} icon="▲" color="text-orange-500" />
              <StatCard label="Volcanoes" value={volcs.length} icon="◆" color="text-green-500" />
            </div>

            {/* Severity Distribution */}
            <div className="bg-slate-850 border border-slate-800 rounded-lg p-4 space-y-3.5 shadow-md">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Severity Distribution</h3>
              <div className="space-y-3">
                {Object.entries(severityCounts).map(([key, val]) => {
                  const pct = getPct(val);
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{SEVERITY_LABELS[key]}</span>
                        <span className="text-slate-400">{val} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${SEVERITY_COLORS[key]}`}
                          style={key === "extreme" ? { backgroundColor: "#d946ef" } : {}}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Earthquake Magnitudes Bar Chart */}
            <div className="bg-slate-850 border border-slate-800 rounded-lg p-4 space-y-3 shadow-md">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Earthquake Magnitudes</h3>
              <div className="flex justify-center pt-2">
                <svg width={chartWidth} height={chartHeight} className="overflow-visible select-none">
                  {/* Grid Lines */}
                  {[0, 0.5, 1].map((val) => {
                    const y = chartHeight - 20 - val * (chartHeight - 40);
                    return (
                      <g key={val}>
                        <line x1={25} y1={y} x2={chartWidth - 10} y2={y} stroke="#334155" strokeWidth={1} strokeDasharray="4 4" />
                        <text x={18} y={y + 4} fill="#64748b" fontSize={9} textAnchor="end">
                          {Math.round(val * maxMagVal)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bars */}
                  {Object.entries(magRanges).map(([range, count], idx) => {
                    const x = paddingLeft + idx * (barWidth + spacing);
                    const pctHeight = count / maxMagVal;
                    const bHeight = Math.max(pctHeight * (chartHeight - 40), count > 0 ? 4 : 0);
                    const y = chartHeight - 20 - bHeight;

                    return (
                      <g key={range} className="group">
                        {/* Bar */}
                        <motion.rect
                          initial={{ y: chartHeight - 20, height: 0 }}
                          animate={{ y, height: bHeight }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.1 }}
                          x={x}
                          width={barWidth}
                          rx={3}
                          fill="#3b82f6"
                          fillOpacity={0.8}
                          className="hover:fill-blue-400 hover:fill-opacity-100 cursor-pointer transition-colors duration-150"
                        />
                        {/* Value Label */}
                        <text
                          x={x + barWidth / 2}
                          y={y - 5}
                          fill="#ffffff"
                          fontSize={9}
                          fontWeight="bold"
                          textAnchor="middle"
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        >
                          {count}
                        </text>
                        {/* X Axis Label */}
                        <text x={x + barWidth / 2} y={chartHeight - 4} fill="#94a3b8" fontSize={9} textAnchor="middle">
                          {range}
                        </text>
                      </g>
                    );
                  })}
                  <line x1={25} y1={chartHeight - 20} x2={chartWidth - 10} y2={chartHeight - 20} stroke="#475569" strokeWidth={1.5} />
                </svg>
              </div>
            </div>

            {/* Elevated Volcano Alerts */}
            <div className="bg-slate-850 border border-slate-800 rounded-lg p-4 space-y-3 shadow-md">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Elevated Volcano Alerts</h3>
              {activeVolcanoes.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No volcanoes currently at elevated alert levels.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeVolcanoes.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-2 rounded bg-slate-800 border border-slate-700/50 text-xs hover:border-slate-600 transition-colors"
                    >
                      <div className="truncate pr-2">
                        <p className="font-semibold text-slate-200 truncate">{v.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{v.region}</p>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          v.severity === "extreme"
                            ? "bg-magenta-950 text-magenta-300 border border-magenta-500/30"
                            : v.severity === "high"
                            ? "bg-orange-950 text-orange-300 border border-orange-500/30"
                            : "bg-yellow-950 text-yellow-300 border border-yellow-500/30"
                        }`}
                        style={
                          v.severity === "extreme"
                            ? { backgroundColor: "#581c87", color: "#f3e8ff" }
                            : {}
                        }
                      >
                        {v.severity === "extreme" ? "Warning" : v.severity === "high" ? "Watch" : "Advisory"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-slate-850 border border-slate-800 rounded-lg p-3 flex flex-col justify-between shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 truncate uppercase tracking-wider">{label}</span>
        <span className="text-sm">{icon}</span>
      </div>
      <p className={`text-xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
  );
}
