import { motion, AnimatePresence } from "framer-motion";
import type { DisasterEvent } from "../../types/events";

interface Props {
  event: DisasterEvent | null;
  onClose: () => void;
}

const SEVERITY_BADGE: Record<string, string> = {
  low: "bg-green-900 text-green-300",
  moderate: "bg-amber-900 text-amber-300",
  high: "bg-red-900 text-red-300",
  extreme: "bg-purple-900 text-purple-300",
};

export function EventDetailPanel({ event, onClose }: Props) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute right-0 top-0 h-full w-96 bg-slate-900 border-l border-slate-700 z-[1000] overflow-y-auto shadow-2xl"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Event Detail
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${SEVERITY_BADGE[event.severity]}`}>
                {event.severity}
              </span>
              <p className="mt-2 text-white font-semibold text-base leading-snug">{event.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="Magnitude" value={event.magnitude ? `M${event.magnitude.toFixed(1)}` : "—"} />
              <Stat label="Depth" value={event.depth_km ? `${event.depth_km.toFixed(1)} km` : "—"} />
              <Stat label="Latitude" value={event.latitude.toFixed(3)} />
              <Stat label="Longitude" value={event.longitude.toFixed(3)} />
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Time</p>
              <p className="text-slate-300 text-sm mt-0.5">
                {new Date(event.timestamp).toLocaleString()}
              </p>
            </div>

            {event.description && (
              <p className="text-sm text-slate-400 leading-relaxed">{event.description}</p>
            )}

            <div className="pt-2 border-t border-slate-700 text-xs text-slate-500">
              Source: <span className="text-slate-400">{event.source}</span>
            </div>

            {event.source_url && (
              <a
                href={event.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm bg-slate-800 hover:bg-slate-700 text-blue-400 py-2 rounded transition-colors border border-slate-600"
              >
                View on {event.source} &#8599;
              </a>
            )}
        </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800 rounded p-2">
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-white font-semibold text-sm mt-0.5">{value}</p>
    </div>
  );
}