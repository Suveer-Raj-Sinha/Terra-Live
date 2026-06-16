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

async def fetch_from_firms(source: str, days: int, limit: int, client: httpx.AsyncClient) -> list[dict]:
    """Fetch CSV data from a single FIRMS source."""
    url = (
        f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
        f"{config.NASA_FIRMS_KEY}/{source}/world/{days}"
    )
    try:
        response = await client.get(url)
        response.raise_for_status()
        lines = response.text.strip().split("\n")
        if len(lines) < 2:
            return []
        headers = lines[0].split(",")
        rows = []
        for line in lines[1:limit + 1]:
            parts = line.split(",")
            if len(parts) >= len(headers):
                rows.append(dict(zip(headers, parts)))
        return rows
    except Exception as e:
        print(f"FIRMS {source} fetch error: {e}")
        return []

async def fetch_wildfires(days: int = 2, limit: int = 500) -> list[DisasterEvent]:
    days = min(days, 2)

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Fetch both VIIRS and MODIS in parallel
        import asyncio
        viirs_rows, modis_rows = await asyncio.gather(
            fetch_from_firms("VIIRS_SNPP_NRT", days, limit // 2, client),
            fetch_from_firms("MODIS_NRT", days, limit // 2, client),
        )

    all_rows = viirs_rows + modis_rows
    seen_locations = set()
    events = []

    for i, row in enumerate(all_rows):
        try:
            lat = float(row.get("latitude", 0))
            lon = float(row.get("longitude", 0))

            # Deduplicate nearby points (round to 1 decimal)
            location_key = (round(lat, 1), round(lon, 1))
            if location_key in seen_locations:
                continue
            seen_locations.add(location_key)

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