import axios from "axios";
import type { EventsResponse } from "../types/events";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 15000,
});

export const earthquakesApi = {
  getAll: (params?: { days?: number; min_magnitude?: number }) =>
    api.get<EventsResponse>("/earthquakes", { params }).then(r => r.data),
};

export const wildfireApi = {
  getAll: (params?: { days?: number }) =>
    api.get<EventsResponse>("/wildfires", { params }).then(r => r.data),
};

export const stormApi = {
  getAll: (params?: { days?: number }) =>
    api.get<EventsResponse>("/storms", { params }).then(r => r.data),
};

export const eventsApi = {
  getAll: (params?: { days?: number; min_magnitude?: number; types?: string }) =>
    api.get<EventsResponse>("/events", { params }).then(r => r.data),
};

export default api;