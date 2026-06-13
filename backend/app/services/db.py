import sqlite3
import os
from datetime import datetime, timedelta, timezone
from app.models.event import DisasterEvent

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "disaster_watch.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            severity TEXT NOT NULL,
            magnitude REAL,
            depth_km REAL,
            timestamp TEXT NOT NULL,
            description TEXT,
            source TEXT NOT NULL,
            source_url TEXT,
            region TEXT
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events (timestamp DESC)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_type_timestamp ON events (type, timestamp DESC)")
    conn.commit()
    conn.close()

def save_events(events: list[DisasterEvent]):
    if not events:
        return
    conn = get_connection()
    cursor = conn.cursor()
    
    # Batch insert or replace
    sql = """
        INSERT OR REPLACE INTO events (
            id, type, title, latitude, longitude, severity, magnitude, depth_km, timestamp, description, source, source_url, region
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    data = []
    for e in events:
        # Normalize timestamp to ISO string in UTC
        ts_str = e.timestamp.astimezone(timezone.utc).isoformat()
        data.append((
            e.id,
            e.type,
            e.title,
            e.latitude,
            e.longitude,
            e.severity,
            e.magnitude,
            e.depth_km,
            ts_str,
            e.description,
            e.source,
            e.source_url,
            e.region
        ))
    
    cursor.executemany(sql, data)
    conn.commit()
    conn.close()

def get_events(types: list[str], min_magnitude: float, days: int, limit: int) -> list[DisasterEvent]:
    conn = get_connection()
    cursor = conn.cursor()
    
    # Calculate cutoff time in ISO format
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    placeholders = ",".join("?" for _ in types)
    
    sql = f"""
        WITH RankedEvents AS (
            SELECT *,
                   ROW_NUMBER() OVER (PARTITION BY type ORDER BY timestamp DESC) as rn
            FROM events
            WHERE type IN ({placeholders})
              AND (magnitude >= ? OR magnitude IS NULL)
              AND timestamp >= ?
        )
        SELECT id, type, title, latitude, longitude, severity, magnitude, depth_km, timestamp, description, source, source_url, region
        FROM RankedEvents
        WHERE rn <= ?
        ORDER BY timestamp DESC
    """
    
    params = list(types) + [min_magnitude, cutoff, limit]
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    conn.close()
    
    events = []
    for row in rows:
        # Convert timestamp string back to datetime object
        ts_str = row["timestamp"]
        # Handle 'Z' suffix or standard offsets
        if ts_str.endswith("Z"):
            ts_str = ts_str[:-1] + "+00:00"
        try:
            ts = datetime.fromisoformat(ts_str)
        except ValueError:
            # Fallback if isoformat parsing fails
            ts = datetime.now(timezone.utc)

        events.append(DisasterEvent(
            id=row["id"],
            type=row["type"],
            title=row["title"],
            latitude=row["latitude"],
            longitude=row["longitude"],
            severity=row["severity"],
            magnitude=row["magnitude"],
            depth_km=row["depth_km"],
            timestamp=ts,
            description=row["description"],
            source=row["source"],
            source_url=row["source_url"],
            region=row["region"]
        ))
        
    return events
