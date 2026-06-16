# DisasterWatch: Comprehensive Technical Architecture Report

## 1. Executive Summary
DisasterWatch is a full-stack natural hazard monitoring platform. It aggregates global hazard feeds—specifically seismic activity (USGS), thermal anomalies (NASA FIRMS), geological alerts (USGS Volcanoes), and meteorology (GDACS Tropical Cyclones)—into a unified database cache. The client dashboard renders these hazards dynamically on a Leaflet map, transitioning between localized heatmaps and high-performance custom vector markers. A tectonic plate boundary layer overlay provides geographical context to seismic and volcanic zones.

---

## 2. Directory Layout & Module Map
The codebase is structured as a decoupled monorepo containing a Python (FastAPI) backend and a React (Vite/TypeScript) frontend.

```
disasterWatch/
├── README.md                      # Main project documentation
├── backend/
│   ├── disaster_watch.db          # Cache SQLite database
│   ├── requirements.txt           # Python backend dependencies
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py              # Environment variable declarations
│   │   ├── main.py                # Server execution, lifespan, background worker
│   │   ├── models/
│   │   │   └── event.py           # Pydantic schemas (DisasterEvent, EventsResponse)
│   │   ├── routers/
│   │   │   ├── earthquakes.py     # GET /earthquakes router
│   │   │   ├── events.py          # GET /events router (consolidated)
│   │   │   ├── storms.py          # GET /storms router
│   │   │   ├── volcanoes.py       # GET /volcanoes router
│   │   │   └── wildfires.py       # GET /wildfires router
│   │   └── services/
│   │       ├── db.py              # SQLite DDL and query functions
│   │       ├── firms.py           # NASA FIRMS CSV parsing logic
│   │       ├── storms.py          # GDACS storm GeoJSON ingestion
│   │       ├── usgs.py            # USGS earthquake GeoJSON ingestion
│   │       └── volcanoes.py       # USGS volcanoes GeoJSON ingestion
└── frontend/
    ├── package.json               # Node dependencies and scripts
    ├── vite.config.ts             # Vite configuration
    ├── tsconfig.json              # TypeScript compilation directives
    ├── public/
    │   └── pb2002_boundaries.json # Tectonic plate boundary GeoJSON (Peter Bird dataset)
    └── src/
        ├── App.tsx                # Client core, filtering state, panel controls
        ├── main.tsx               # DOM insertion, React Query provider wrap
        ├── index.css              # Main tailwind styles
        ├── api/
        │   └── client.ts          # Axios API wrappers
        ├── hooks/
        │   └── useEvents.ts       # React Query state management wrapper
        ├── types/
        │   └── events.ts          # TypeScript declarations matching Pydantic schemas
        └── components/
            ├── Map/
            │   ├── DisasterMap.tsx       # Leaflet wrapper, zoom logic, legend
            │   ├── EarthquakeMarker.tsx  # Circular Canvas marker
            │   ├── VolcanoMarker.tsx     # Custom 5-point crater cone polygon
            │   ├── WildfireMarker.tsx    # Custom 3-point triangle polygon
            │   ├── StormMarker.tsx       # Custom 6-point pinwheel cyclone polygon
            │   └── HeatmapLayer.tsx      # Leaflet Heat plugin integration layer
            └── Sidebar/
                ├── AnalyticsPanel.tsx    # Statistics dashboard, custom SVG bar chart
                ├── EventDetailPanel.tsx  # Collapsable panel showing item attributes
                └── FilterPanel.tsx       # Filter controls for timespan, types, magnitude
```

---

## 3. End-to-End Data Lifecycle

To illustrate how data flows through the system, the diagram below outlines the path a single disaster event takes from origin detection to client rendering.

```
[Satellite / Seismometer Detection]
               │
               ▼
[External API Feed (USGS, NASA, GDACS)]
               │
               ▼  HTTPX Async Request (every 5 min)
    [app/services/storms.py]
               │
               ▼  Normalize to Pydantic Event Model
    [app/services/db.py] (save_events)
               │
               ▼  INSERT OR REPLACE (ISO 8601 UTC Timestamp)
    [(disaster_watch.db)]
               │
               ▼  Indexed Query (SELECT with Ranked CTEs)
     [app/routers/events.py]
               │
               ▼  HTTP Response (JSON payload)
     [frontend/src/api/client.ts]
               │
               ▼  React Query Cache (useEvents hook)
    [frontend/src/App.tsx]
               │
               ▼  Re-render Trigger
[DisasterMap (React-Leaflet Canvas / GeoJSON)]
```

### 3.1 Step 1: Backend Ingestion (Services Layer)
*   The worker loop in `app/main.py` wakes up every 300 seconds and spawns ingestion scripts.
*   **Parallel Fetching**: Uses `asyncio.gather` inside `sync_all_feeds()` to request USGS, FIRMS, USGS Volcanoes, and GDACS feeds concurrently.
*   **Data Parsing & Normalization**:
    *   *GDACS Storms*: Queries `geteventlist/SEARCH?eventlist=TC`. Parses the GeoJSON coordinates and checks if `"iscurrent": "true"`. If the storm is inactive, it is immediately skipped to keep the feed live-only.
    *   *NASA FIRMS*: Downloads a CSV feed. Splits rows, reads CSV keys, and performs deduplication by rounding coordinates:
        $$Key = (\text{round}(latitude, 1), \text{round}(longitude, 1))$$
        If the rounded coordinate has been seen during the current iteration, it is discarded to prevent dense fire arrays from polluting the feed.

### 3.2 Step 2: Persistence (Database Layer)
*   Parsed objects are packaged into `DisasterEvent` Pydantic models.
*   The lists of events are sent to `save_events()` in `app/services/db.py`.
*   **Time Normalization**: All timestamps are parsed and standardized to UTC ISO 8601 strings:
    ```python
    ts_str = event.timestamp.astimezone(timezone.utc).isoformat()
    ```
*   **Database Write**: The database inserts or updates records via an optimized batch statement:
    ```sql
    INSERT OR REPLACE INTO events (id, type, title, latitude, longitude, severity, magnitude, depth_km, timestamp, description, source, source_url, region) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ```

### 3.3 Step 3: API Delivery (Routers Layer)
*   The frontend client queries `/events?types=earthquake,wildfire,volcano,storm&days=7&min_magnitude=4.5`.
*   The backend processes this query inside `get_events` in `db.py`:
    1.  Calculates the UTC cutoff timestamp:
        $$Cutoff = (\text{now(timezone.utc)} - \text{timedelta}(days)).\text{isoformat}()$$
    2.  Executes a query with a Common Table Expression (CTE) to partition and rank events, ensuring we don't saturate the response with one event type (e.g. thousands of small earthquakes):
        ```sql
        WITH RankedEvents AS (
            SELECT *,
                   ROW_NUMBER() OVER (PARTITION BY type ORDER BY timestamp DESC) as rn
            FROM events
            WHERE type IN (?, ?, ?, ?)
              AND (magnitude >= ? OR magnitude IS NULL)
              AND timestamp >= ?
        )
        SELECT * FROM RankedEvents WHERE rn <= ? ORDER BY timestamp DESC
        ```

### 3.4 Step 4: Client Caching & Rendering (React Query + Leaflet Canvas)
*   `useEvents` in `frontend/src/hooks/useEvents.ts` queries the endpoint via Axios, caching results with key `["events", filters]`.
*   When React Query resolves, the main `App` component triggers a re-render.
*   The coordinates are mapped to Leaflet canvas points.
*   If **Tectonic Plates** is active, the app asynchronously fetches `/pb2002_boundaries.json` from the `public` directory, and React-Leaflet's `GeoJSON` component parses the features and draws the orange boundaries directly onto the canvas.

---

## 4. Map Vector Math & Canvas Rendering Formulas

To maximize performance, markers are drawn using custom canvas polygons rather than rendering DOM nodes. The calculations to position these markers relative to zoom level and latitude are detailed below.

### 4.1 Mercator Coordinate Scaling
Leaflet works in spherical coordinate space, but screen markers must adjust to the map zoom level to remain visually consistent. The latitude offset in degrees at a given zoom level is calculated using:
$$\Delta_{lat} = baseSize \times \frac{360}{256 \times 2^{zoom}}$$

Since lines of longitude converge at the poles, the longitude offset must be scaled based on the Mercator projection at that latitude:
$$\Delta_{lon} = \frac{\Delta_{lat}}{\max(\cos(\frac{latitude \times \pi}{180}), 0.08)}$$

### 4.2 Polygon Point Maps (Vertices relative to Center `[lat, lon]`)

#### **Wildfire Marker (Triangle)**
Formed by an upward-pointing triangle (3 points):
1.  Top Vertex: $[lat + 1.15 \times \Delta_{lat},\ lon]$
2.  Bottom Left: $[lat - 0.85 \times \Delta_{lat},\ lon - 0.95 \times \Delta_{lon}]$
3.  Bottom Right: $[lat - 0.85 \times \Delta_{lat},\ lon + 0.95 \times \Delta_{lon}]$

```
             /\ (Top Vertex)
            /  \
           /____\
(Bottom Left)    (Bottom Right)
```

#### **Volcano Marker (Crater Cone)**
Formed by a 5-point polygon representing a cone with a crater at the summit:
1.  Bottom Left Base: $[lat - 0.9 \times \Delta_{lat},\ lon - 1.1 \times \Delta_{lon}]$
2.  Top Left Crater Lip: $[lat + 0.8 \times \Delta_{lat},\ lon - 0.35 \times \Delta_{lon}]$
3.  Crater Center Dip: $[lat + 0.3 \times \Delta_{lat},\ lon]$
4.  Top Right Crater Lip: $[lat + 0.8 \times \Delta_{lat},\ lon + 0.35 \times \Delta_{lon}]$
5.  Bottom Right Base: $[lat - 0.9 \times \Delta_{lat},\ lon + 1.1 \times \Delta_{lon}]$

```
      \    /  (Crater Lips & Dip)
     / \__/ \
    /        \
   /__________\
(Bottom Base Points)
```

#### **Storm Marker (Spinning Pinwheel)**
Formed by a 6-point dual-arm S-like pinwheel shape:
1.  Inner Bottom Left: $[lat - 0.2 \times \Delta_{lat},\ lon - 0.4 \times \Delta_{lon}]$
2.  Top Left Arm Tip: $[lat + 0.9 \times \Delta_{lat},\ lon - 1.1 \times \Delta_{lon}]$
3.  Top Left Inner Curve: $[lat + 0.4 \times \Delta_{lat},\ lon - 0.1 \times \Delta_{lon}]$
4.  Inner Top Right: $[lat + 0.2 \times \Delta_{lat},\ lon + 0.4 \times \Delta_{lon}]$
5.  Bottom Right Arm Tip: $[lat - 0.9 \times \Delta_{lat},\ lon + 1.1 \times \Delta_{lon}]$
6.  Bottom Right Inner Curve: $[lat - 0.4 \times \Delta_{lat},\ lon + 0.1 \times \Delta_{lon}]$

```
      \__
    __/  \
   /  \__/
   \__/
```

---

## 5. Analytics & Dashboard Engine
The slide-out analytics drawer provides aggregated statistics calculated directly from client-side array states, eliminating the need for complex database aggregation requests:
*   **Multi-Tabbed Interface**: Organized into three views (Overview, Seismology, and Advisories) to prevent layout density issues.
*   **Global Risk Index**: A circular progress ring showing global threat levels based on active disasters:
    $$Score = \frac{Extreme \times 10 + High \times 6 + Moderate \times 3 + Low \times 1}{Total \times 10} \times 100$$
    Implemented using SVG circle stroke-dashoffset rendering.
*   **Seismology Analytics**: Displays average magnitude and deepest earthquake, alongside the custom SVG bar chart utilizing SVG linearGradients and hover filter dropshadow glows.
*   **Advisories Feed**: Lists active storms and volcanoes with direct fly-to-location integration.

---

## 6. Security & Deployment Architecture

### 6.1 Security Controls
*   **CORS (Cross-Origin Resource Sharing)**:
    Configured in FastAPI's main file using `CORSMiddleware`. Access is restricted to trusted clients using environment variable configurations (e.g. `CORS_ORIGINS=http://localhost:5173`).
*   **Input Sanitization**:
    All router endpoints utilize Pydantic validation layers (e.g., `Query(7, ge=1, le=30)` for days ranges). This prevents SQL injection and buffer overrun payloads from reaching the database query layers.
*   **Error Boundaries**:
    External HTTP requests are wrapped in isolated try-except blocks. If NASA FIRMS or GDACS experiences an outage, the backend sync loop will log the error and continue, serving cached database records without interrupting client operations.

### 6.2 Scaling & Performance Blueprint
To deploy DisasterWatch to production serving thousands of concurrent users, the following adjustments should be made:

```
[Client Users] ---> [Nginx Load Balancer]
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
      [FastAPI #1]  [FastAPI #2]  [FastAPI #3] (Uvicorn Workers)
            │             │             │
            └─────────────┬─────────────┘
                          ▼
                  [PostgreSQL DB] <--- [Standalone Sync Worker]
```

1.  **Migrate database from SQLite to PostgreSQL**:
    SQLite is perfect for development but lacks support for high concurrent write volumes. Under production load with multiple uvicorn worker threads, write operations will cause locking issues. Moving to PostgreSQL will provide robust connection pooling and concurrent write support.
2.  **Separate Ingestion from API Services**:
    Extract the background sync loop from `app/main.py` and run it as a standalone Python script triggered by a system Cron task or Celery scheduler. This guarantees that only one writer process connects to the database, eliminating write locks.
3.  **Implement Redis Caching**:
    Add a Redis cache layer between the FastAPI routers and the database. By caching responses to common requests (like `/events?days=7`) with a 5-minute TTL, the backend can serve data near-instantaneously without querying the database for every user.
4.  **Static Asset CDN Hosting**:
    Host the compiled frontend bundle (`dist/` directory) and the static `pb2002_boundaries.json` tectonic plate dataset on a CDN (like Cloudflare or AWS S3/CloudFront). This keeps asset delivery times low and offloads traffic from the application servers.
