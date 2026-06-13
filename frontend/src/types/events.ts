export interface DisasterEvent {
  id: string;
  type: "earthquake" | "wildfire" | "volcano" | "storm";
  title: string;
  latitude: number;
  longitude: number;
  severity: "low" | "moderate" | "high" | "extreme";
  magnitude?: number;
  depth_km?: number;
  timestamp: string;
  description?: string;
  source: string;
  source_url?: string;
  region?: string;
}

export interface EventsResponse {
  events: DisasterEvent[];
  total: number;
  fetched_at: string;
}

export type SeverityLevel = DisasterEvent["severity"];
export type DisasterType = DisasterEvent["type"];