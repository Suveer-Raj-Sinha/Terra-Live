import httpx
from datetime import datetime, timedelta, timezone
from app.models.event import DisasterEvent
from app import config

def magnitude_to_severity(mag: float) -> str:
    if mag >= 7.0: return "extreme"
    if mag >= 5.5: return "high"
    if mag >= 4.0: return "moderate"
    return "low"

async def fetch_earthquakes(days: int = 7, min_magnitude: float = 2.5, limit: int = 200):
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(days=days)

    params = {
        "format": "geojson",
        "starttime": start_time.strftime("%Y-%m-%d"),
        "endtime": end_time.strftime("%Y-%m-%d"),
        "minmagnitude": min_magnitude,
        "limit": limit,
        "orderby": "time",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(f"{config.USGS_BASE_URL}/query", params=params)
        response.raise_for_status()
        data = response.json()

    events = []
    for feature in data.get("features", []):
        props = feature["properties"]
        coords = feature["geometry"]["coordinates"]
        mag = props.get("mag") or 0.0

        events.append(DisasterEvent(
            id=feature["id"],
            type="earthquake",
            title=props.get("place", "Unknown Location"),
            latitude=coords[1],
            longitude=coords[0],
            severity=magnitude_to_severity(mag),
            magnitude=mag,
            depth_km=coords[2],
            timestamp=datetime.fromtimestamp(props["time"] / 1000, tz=timezone.utc),
            description=f"M{mag} earthquake at depth {coords[2]:.1f}km",
            source="USGS",
            source_url=props.get("url"),
        ))

    return events