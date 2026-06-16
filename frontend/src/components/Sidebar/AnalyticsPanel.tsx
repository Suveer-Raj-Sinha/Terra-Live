import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DisasterEvent } from "../../types/events";

interface Props {
  isOpen: boolean;
  events: DisasterEvent[];
  onClose: () => void;
  onSelectEvent: (event: DisasterEvent) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "from-green-500 to-emerald-600",
  moderate: "from-yellow-400 to-amber-500",
  high: "from-orange-500 to-red-600",
  extreme: "from-purple-500 to-fuchsia-600",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Low / Normal",
  moderate: "Moderate / Advisory",
  high: "High / Watch",
  extreme: "Extreme / Warning",
};

export function AnalyticsPanel({ isOpen, events, onClose, onSelectEvent }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "seismic" | "advisories">("overview");
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  const totalCount = events.length;
  const quakes = events.filter((e) => e.type === "earthquake");
  const fires = events.filter((e) => e.type === "wildfire");
  const volcs = events.filter((e) => e.type === "volcano");
  const storms = events.filter((e) => e.type === "storm");

  // Severity counts
  const severityCounts = {
    low: events.filter((e) => e.severity === "low").length,
    moderate: events.filter((e) => e.severity === "moderate").length,
    high: events.filter((e) => e.severity === "high").length,
    extreme: events.filter((e) => e.severity === "extreme").length,
  };

  // Threat Index Calculations
  const rawScore = totalCount > 0 
    ? ((severityCounts.extreme * 10 + severityCounts.high * 6 + severityCounts.moderate * 3 + severityCounts.low * 1) / (totalCount * 10)) * 100
    : 0;
  const threatScore = Math.min(Math.round(rawScore), 100);

  const getThreatStatus = (score: number) => {
    if (score >= 65) return { label: "CRITICAL ALERT", color: "text-red-500", stroke: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/30" };
    if (score >= 35) return { label: "MODERATE THREAT", color: "text-amber-500", stroke: "#f59e0b", bg: "bg-amber-500/10", border: "border-amber-500/30" };
    return { label: "STABLE ENVIRONMENT", color: "text-green-500", stroke: "#10b981", bg: "bg-green-500/10", border: "border-green-500/30" };
  };
  const threat = getThreatStatus(threatScore);

  // Circular progress ring metrics
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (threatScore / 100) * circumference;

  // Earthquake magnitude splits
  const magRanges = {
    "2.5-4.0": quakes.filter((e) => typeof e.magnitude === "number" && e.magnitude >= 2.5 && e.magnitude < 4.0).length,
    "4.0-5.5": quakes.filter((e) => typeof e.magnitude === "number" && e.magnitude >= 4.0 && e.magnitude < 5.5).length,
    "5.5-7.0": quakes.filter((e) => typeof e.magnitude === "number" && e.magnitude >= 5.5 && e.magnitude < 7.0).length,
    "7.0+": quakes.filter((e) => typeof e.magnitude === "number" && e.magnitude >= 7.0).length,
  };

  const avgQuakeMag = quakes.length > 0
    ? quakes.reduce((sum, q) => sum + (q.magnitude ?? 0), 0) / quakes.length
    : 0;

  const deepestQuake = quakes.length > 0
    ? Math.max(...quakes.map((q) => q.depth_km ?? 0))
    : 0;

  // Live filter lists
  const activeVolcanoes = volcs.filter((v) => v.severity !== "low").slice(0, 10);
  const activeStorms = storms.slice(0, 10);

  // SVG Chart Dimensions
  const maxMagVal = Math.max(...Object.values(magRanges), 1);
  const chartWidth = 320;
  const chartHeight = 130;
  const barWidth = 42;
  const spacing = 26;
  const paddingLeft = 32;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 220 }}
          className="absolute left-0 top-0 h-full w-[410px] bg-slate-900/95 backdrop-blur-md border-r border-slate-700/60 z-[1000] overflow-y-auto shadow-2xl flex flex-col font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900/40 sticky top-0 backdrop-blur-md z-20">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📊</span>
              <div>
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Hazard Intelligence
                </h2>
                <p className="text-[10px] text-slate-500 font-medium">REAL-TIME RISK ANALYTICS</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors text-xs font-semibold"
            >
              ✕
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-900/20 p-2 gap-1.5 shrink-0 z-10">
            <TabButton active={activeTab === "overview"} label="Overview" icon="📊" onClick={() => setActiveTab("overview")} />
            <TabButton active={activeTab === "seismic"} label="Seismology" icon="⭕" onClick={() => setActiveTab("seismic")} />
            <TabButton active={activeTab === "advisories"} label="Advisories" icon="🔔" onClick={() => setActiveTab("advisories")} />
          </div>

          {/* Content Area */}
          <div className="p-4 flex-1 space-y-5 overflow-y-auto">
            {activeTab === "overview" && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                
                {/* Threat Index Ring Card */}
                <div className={`border rounded-xl p-4 flex items-center justify-between transition-all shadow-lg ${threat.bg} ${threat.border}`}>
                  <div className="space-y-1 pr-3 max-w-[200px]">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Global Risk Index</span>
                    <h3 className={`text-sm font-black uppercase tracking-wider ${threat.color}`}>{threat.label}</h3>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Weighted threat score based on active seismological, wildfire, volcanic, and storm detections.
                    </p>
                  </div>
                  
                  {/* SVG circular progress ring */}
                  <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="48" cy="48" r={radius} stroke="#1e293b" strokeWidth="6" fill="transparent" />
                      <motion.circle
                        cx="48"
                        cy="48"
                        r={radius}
                        stroke={threat.stroke}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.1, ease: "easeOut" }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-extrabold text-white tracking-tight">{threatScore}</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Risk</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <StatCard label="Total Events" value={totalCount} icon="🌍" color="text-blue-400" bg="bg-slate-800/40" />
                  </div>
                  <StatCard label="Earthquakes" value={quakes.length} icon="⭕" color="text-blue-500" bg="bg-blue-950/10" />
                  <StatCard label="Wildfires" value={fires.length} icon="🔥" color="text-orange-500" bg="bg-orange-950/10" />
                  <StatCard label="Volcanoes" value={volcs.length} icon="🌋" color="text-purple-500" bg="bg-purple-950/10" />
                  <StatCard label="Storms" value={storms.length} icon="🌀" color="text-cyan-400" bg="bg-cyan-950/10" />
                </div>

                {/* Severity Distribution */}
                <div className="bg-slate-850 border border-slate-800/80 rounded-xl p-4 space-y-4 shadow-lg">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Severity Distribution</h3>
                  <div className="space-y-3">
                    {Object.entries(severityCounts).map(([key, val]) => {
                      const pct = totalCount > 0 ? (val / totalCount) * 100 : 0;
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300 font-medium">{SEVERITY_LABELS[key]}</span>
                            <span className="text-slate-400 font-semibold">{val} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.9, ease: "easeOut" }}
                              className={`h-full rounded-full bg-gradient-to-r ${SEVERITY_COLORS[key]}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "seismic" && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                
                {/* Seismic Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-850 border border-slate-800/60 rounded-lg p-3">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Average Magnitude</p>
                    <p className="text-lg font-extrabold text-blue-400 mt-1">
                      {avgQuakeMag > 0 ? `M${avgQuakeMag.toFixed(2)}` : "N/A"}
                    </p>
                  </div>
                  <div className="bg-slate-850 border border-slate-800/60 rounded-lg p-3">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Max Depth Record</p>
                    <p className="text-lg font-extrabold text-indigo-400 mt-1">
                      {deepestQuake > 0 ? `${deepestQuake.toFixed(1)} km` : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Earthquake Magnitudes Bar Chart */}
                <div className="bg-slate-850 border border-slate-800/80 rounded-xl p-4 shadow-lg space-y-4">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Magnitude Distributions</h3>
                  
                  <div className="flex justify-center pt-2">
                    <svg width={chartWidth} height={chartHeight} className="overflow-visible select-none">
                      {/* Grid Lines */}
                      {[0, 0.5, 1].map((val) => {
                        const y = chartHeight - 22 - val * (chartHeight - 42);
                        return (
                          <g key={val}>
                            <line x1={25} y1={y} x2={chartWidth - 5} y2={y} stroke="#1e293b" strokeWidth={1} strokeDasharray="3 3" />
                            <text x={18} y={y + 3.5} fill="#475569" fontSize={9} textAnchor="end" className="font-mono">
                              {Math.round(val * maxMagVal)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Bars */}
                      {Object.entries(magRanges).map(([range, count], idx) => {
                        const x = paddingLeft + idx * (barWidth + spacing);
                        const pctHeight = count / maxMagVal;
                        const bHeight = Math.max(pctHeight * (chartHeight - 42), count > 0 ? 5 : 0);
                        const y = chartHeight - 22 - bHeight;
                        const isHovered = hoveredBar === range;

                        return (
                          <g key={range} className="group cursor-pointer" onMouseEnter={() => setHoveredBar(range)} onMouseLeave={() => setHoveredBar(null)}>
                            {/* Glow filter definition when hovered */}
                            <defs>
                              <filter id={`glow-${idx}`} x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                              </filter>
                            </defs>

                            {/* Bar Path */}
                            <motion.rect
                              initial={{ y: chartHeight - 22, height: 0 }}
                              animate={{ y, height: bHeight }}
                              transition={{ duration: 0.7, ease: "easeOut", delay: idx * 0.08 }}
                              x={x}
                              width={barWidth}
                              rx={4}
                              fill="url(#blueGradient)"
                              className="transition-all duration-200"
                              style={isHovered ? { filter: `url(#glow-${idx})`, fill: "#60a5fa" } : {}}
                            />
                            
                            {/* Label */}
                            <text
                              x={x + barWidth / 2}
                              y={y - 6}
                              fill="#ffffff"
                              fontSize={9.5}
                              fontWeight="bold"
                              textAnchor="middle"
                              className={`transition-opacity duration-150 ${isHovered ? "opacity-100" : "opacity-0"}`}
                            >
                              {count}
                            </text>
                            
                            {/* X Axis Range */}
                            <text x={x + barWidth / 2} y={chartHeight - 4} fill="#64748b" fontSize={9.5} fontWeight="medium" textAnchor="middle">
                              {range}
                            </text>
                          </g>
                        );
                      })}

                      {/* Gradients */}
                      <defs>
                        <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>
                      </defs>
                      <line x1={25} y1={chartHeight - 22} x2={chartWidth - 5} y2={chartHeight - 22} stroke="#334155" strokeWidth={1.5} />
                    </svg>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "advisories" && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                
                {/* Active Storms List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span>🌀</span> Active Storm Advisories
                    </h3>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                      {activeStorms.length} Active
                    </span>
                  </div>

                  {activeStorms.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-850 rounded border border-slate-800">
                      No active tropical storm alerts.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {activeStorms.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => onSelectEvent(s)}
                          className="p-2.5 rounded bg-slate-850 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all active:scale-[0.98] flex items-center justify-between text-xs"
                        >
                          <div className="truncate pr-2">
                            <p className="font-semibold text-slate-200 truncate">{s.title}</p>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{s.region ?? "Open ocean"}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/20 shrink-0">
                            {s.magnitude ? `${s.magnitude.toFixed(0)} km/h` : "Cyclone"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Elevated Volcano Alerts */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span>🌋</span> Volcano Alert Levels
                    </h3>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                      {activeVolcanoes.length} Elevated
                    </span>
                  </div>

                  {activeVolcanoes.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-850 rounded border border-slate-800">
                      No volcanic advisories at elevated alert levels.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {activeVolcanoes.map((v) => (
                        <div
                          key={v.id}
                          onClick={() => onSelectEvent(v)}
                          className="flex items-center justify-between p-2.5 rounded bg-slate-850 border border-slate-800 hover:border-purple-500/50 cursor-pointer transition-all active:scale-[0.98] text-xs"
                        >
                          <div className="truncate pr-2">
                            <p className="font-semibold text-slate-200 truncate">{v.title}</p>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{v.region}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 border ${
                              v.severity === "extreme"
                                ? "bg-purple-950/70 text-purple-300 border-purple-500/20"
                                : v.severity === "high"
                                ? "bg-red-950/70 text-red-300 border-red-500/20"
                                : "bg-yellow-950/70 text-yellow-300 border-yellow-500/20"
                            }`}
                          >
                            {v.severity === "extreme" ? "Warning" : v.severity === "high" ? "Watch" : "Advisory"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface TabButtonProps {
  active: boolean;
  label: string;
  icon: string;
  onClick: () => void;
}

function TabButton({ active, label, icon, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-bold transition-all ${
        active
          ? "bg-blue-600 text-white shadow-md shadow-blue-500/10 font-bold"
          : "bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: string;
  bg: string;
}

function StatCard({ label, value, icon, color, bg }: StatCardProps) {
  return (
    <div className={`border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between shadow-md transition-all hover:border-slate-700 hover:scale-[1.01] ${bg}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-wider">{label}</span>
        <span className="text-xs">{icon}</span>
      </div>
      <p className={`text-xl font-extrabold mt-2 tracking-tight ${color}`}>{value}</p>
    </div>
  );
}
