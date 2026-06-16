import * as L from "leaflet";

declare module "leaflet" {
  interface HeatLatLngTuple extends Array<number> {
    0: number; // lat
    1: number; // lng
    2: number; // intensity
  }

  interface HeatMapOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: Record<string, string>;
  }

  function heatLayer(
    latlngs: HeatLatLngTuple[],
    options?: HeatMapOptions
  ): Layer;
}