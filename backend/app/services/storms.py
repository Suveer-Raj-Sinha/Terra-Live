import httpx
from datetime import datetime, timezone
from app.models.event import DisasterEvent

def alert_to_severity(alert: str) -> str:
    alert = str(alert).lower()
    if "red" in alert:
        return "extreme"
    if "orange" in alert:
        return "high"
    if "green" in alert:
        return "moderate"
    return "low"

async def fetch_storms() -> list[DisasterEvent]:
    url = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC"
    events = []
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
        features = data.get("features", [])
        for feature in features:
            props = feature.get("properties", {})
            
            # Only ingest active / live storms
            is_current = str(props.get("iscurrent", "false")).lower() == "true"
            if not is_current:
                continue
                
            geom = feature.get("geometry", {})
            if not geom or geom.get("type") != "Point":
                continue
                
            coords = geom.get("coordinates", [])
            if len(coords) < 2:
                continue
                
            event_id = props.get("eventid") or f"unknown-{len(events)}"
            event_name = props.get("eventname") or "Unnamed Storm"
            alert_level = props.get("alertlevel") or "green"
            
            # Parse datetime
            from_date_val = props.get("fromdate")
            timestamp = datetime.now(timezone.utc)
            if from_date_val:
                try:
                    # e.g., "2026-04-09T00:00:00"
                    timestamp = datetime.fromisoformat(from_date_val).replace(tzinfo=timezone.utc)
                except Exception:
                    pass
            
            # Parse magnitude (wind speed in km/h)
            magnitude = None
            sev_data = props.get("severitydata")
            if sev_data and isinstance(sev_data, dict):
                magnitude = sev_data.get("severity")
                
            desc = props.get("htmldescription") or props.get("description") or "Tropical Cyclone Alert"
            source_url = props.get("url", {}).get("report") or "https://www.gdacs.org"
            region = props.get("country")
            
            events.append(DisasterEvent(
                id=f"gdacs-TC-{event_id}",
                type="storm",
                title=f"Tropical Cyclone {event_name}",
                latitude=coords[1],
                longitude=coords[0],
                severity=alert_to_severity(alert_level),
                magnitude=magnitude,
                depth_km=None,
                timestamp=timestamp,
                description=desc,
                source=f"GDACS ({props.get('source', 'NOAA/JTWC')})",
                source_url=source_url,
                region=region
            ))
            
    except Exception as e:
        print(f"GDACS Storms fetch error: {e}")
        
    return events
