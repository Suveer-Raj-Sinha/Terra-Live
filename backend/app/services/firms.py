import httpx
from datetime import datetime, timezone
from app.models.event import DisasterEvent
from app import config

def firms_confidence_to_severity(confidence) -> str:
    try:
        c = int(confidence)
        if c >= 80: return "high"
        if c >= 50: return "moderate"
        return "low"
    except:
        if str(confidence).lower() == "h": return "high"
        if str(confidence).lower() == "n": return "moderate"
        return "low"

async def fetch_wildfires(days: int = 1, limit: int = 200) -> list[DisasterEvent]:
    """
    Fetch wildfire hotspots from NASA FIRMS.
    For global queries ('world'), the API only allows 1 or 2 days of data.
    """
    if days >= 2:
        days = 2
    else:
        days = 1

    url = (
        f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
        f"{config.NASA_FIRMS_KEY}/VIIRS_SNPP_NRT/world/{days}"
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        text = response.text

    events = []
    lines = text.strip().split("\n")
    if len(lines) < 2:
        return events

    headers = lines[0].split(",")

    for i, line in enumerate(lines[1:limit + 1]):  # cap at limit
        parts = line.split(",")
        if len(parts) < len(headers):
            continue

        row = dict(zip(headers, parts))

        try:
            lat = float(row.get("latitude", 0))
            lon = float(row.get("longitude", 0))
            confidence = row.get("confidence", "0")
            acq_date = row.get("acq_date", "")
            acq_time = row.get("acq_time", "0000").zfill(4)

            timestamp_str = f"{acq_date} {acq_time[:2]}:{acq_time[2:]}"
            timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M").replace(
                tzinfo=timezone.utc
            )

            conf_str = str(confidence).strip().lower()
            if conf_str == "h":
                confidence_display = "High"
            elif conf_str == "n":
                confidence_display = "Nominal"
            elif conf_str == "l":
                confidence_display = "Low"
            else:
                confidence_display = f"{confidence}%"

            events.append(DisasterEvent(
                id=f"firms-{i}-{lat}-{lon}",
                type="wildfire",
                title=f"Wildfire hotspot near {lat:.2f}, {lon:.2f}",
                latitude=lat,
                longitude=lon,
                severity=firms_confidence_to_severity(confidence),
                timestamp=timestamp,
                description=f"Satellite-detected fire hotspot. Confidence: {confidence_display}",
                source="NASA FIRMS",
                source_url="https://firms.modaps.eosdis.nasa.gov",
            ))
        except Exception:
            continue

    return events