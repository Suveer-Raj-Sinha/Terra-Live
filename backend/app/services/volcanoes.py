import httpx
from datetime import datetime, timezone
from app.models.event import DisasterEvent

def volcano_to_severity(alert_level: str, color_code: str) -> str:
    al = str(alert_level).upper()
    cc = str(color_code).upper()
    if al == "WARNING" or cc == "RED":
        return "extreme"
    if al == "WATCH" or cc == "ORANGE":
        return "high"
    if al == "ADVISORY" or cc == "YELLOW":
        return "moderate"
    return "low"

async def fetch_volcanoes() -> list[DisasterEvent]:
    url = "https://volcanoes.usgs.gov/vsc/api/volcanoApi/geojson"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()
        
    events = []
    features = data.get("features", [])
    
    for feature in features:
        props = feature.get("properties", {})
        geometry = feature.get("geometry", {})
        if not geometry or geometry.get("type") != "Point":
            continue
            
        coords = geometry.get("coordinates", [])
        if len(coords) < 2:
            continue
            
        vnum = props.get("vnum") or f"unknown-{len(events)}"
        volcano_name = props.get("volcanoName") or "Unknown Volcano"
        alert_level = props.get("alertLevel") or "UNASSIGNED"
        color_code = props.get("colorCode") or "UNASSIGNED"
        region = props.get("region") or "Unknown Region"
        threat = props.get("nvewsThreat") or "Unknown Threat"
        volcano_url = props.get("volcanoUrl") or "https://volcanoes.usgs.gov"
        
        # Handle timestamp: use current time if alertDate is not provided or invalid
        alert_date_val = props.get("alertDate")
        timestamp = datetime.now(timezone.utc)
        if alert_date_val:
            try:
                # If it's a numeric timestamp (ms since epoch)
                if isinstance(alert_date_val, (int, float)):
                    timestamp = datetime.fromtimestamp(alert_date_val / 1000, tz=timezone.utc)
                else:
                    # Try parsing as ISO format or similar
                    timestamp = datetime.fromisoformat(str(alert_date_val).replace("Z", "+00:00"))
            except Exception:
                pass
                
        severity = volcano_to_severity(alert_level, color_code)
        
        description = f"Volcano alert status. Level: {alert_level}, Color: {color_code}. Threat Level: {threat}."
        
        events.append(DisasterEvent(
            id=f"volcano-{vnum}",
            type="volcano",
            title=volcano_name,
            latitude=coords[1],
            longitude=coords[0],
            severity=severity,
            timestamp=timestamp,
            description=description,
            source="USGS Volcano Hazards Program",
            source_url=volcano_url,
            region=region
        ))
        
    return events
