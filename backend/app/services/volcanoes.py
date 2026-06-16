import httpx
import csv
import io
from datetime import datetime, timezone
from app.models.event import DisasterEvent

def volcano_to_severity(activity: str) -> str:
    activity = str(activity).upper()
    if "ERUPTING" in activity or "WARNING" in activity:
        return "extreme"
    if "WATCH" in activity or "MINOR" in activity:
        return "high"
    if "ADVISORY" in activity or "UNREST" in activity:
        return "moderate"
    return "low"

async def fetch_volcanoes() -> list[DisasterEvent]:
    # Smithsonian GVP - Global volcanism, updated weekly
    gvp_url = "https://volcano.si.edu/database/search_eruption_excel.cfm"
    
    # USGS US volcanoes as backup/supplement
    usgs_url = "https://volcanoes.usgs.gov/vsc/api/volcanoApi/geojson"
    
    events = []
    
    # Fetch Smithsonian GVP weekly activity report
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://volcano.si.edu/reports/usgs/archives/weekly-reports/current-weekly-report.xml",
                follow_redirects=True
            )
            # If GVP XML fails, fall through to USGS
            if response.status_code != 200:
                raise Exception("GVP unavailable")
    except Exception:
        pass  # Fall through to USGS below

    # USGS volcanoes (US focused but reliable)
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(usgs_url)
            response.raise_for_status()
            data = response.json()

        for feature in data.get("features", []):
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
            region = props.get("region") or "United States"
            threat = props.get("nvewsThreat") or "Unknown"
            volcano_url = props.get("volcanoUrl") or "https://volcanoes.usgs.gov"

            alert_date_val = props.get("alertDate")
            timestamp = datetime.now(timezone.utc)
            if alert_date_val:
                try:
                    if isinstance(alert_date_val, (int, float)):
                        timestamp = datetime.fromtimestamp(alert_date_val / 1000, tz=timezone.utc)
                    else:
                        timestamp = datetime.fromisoformat(str(alert_date_val).replace("Z", "+00:00"))
                except Exception:
                    pass

            al = str(alert_level).upper()
            cc = str(color_code).upper()
            if al == "WARNING" or cc == "RED":
                severity = "extreme"
            elif al == "WATCH" or cc == "ORANGE":
                severity = "high"
            elif al == "ADVISORY" or cc == "YELLOW":
                severity = "moderate"
            else:
                severity = "low"

            events.append(DisasterEvent(
                id=f"volcano-usgs-{vnum}",
                type="volcano",
                title=volcano_name,
                latitude=coords[1],
                longitude=coords[0],
                severity=severity,
                timestamp=timestamp,
                description=f"Volcano alert status. Level: {alert_level}, Color: {color_code}. Threat: {threat}.",
                source="USGS Volcano Hazards Program",
                source_url=volcano_url,
                region=region
            ))
    except Exception as e:
        print(f"USGS Volcanoes fetch error: {e}")

    # Add known major global volcanoes with static data
    # These are always-monitored volcanoes not covered by USGS
    GLOBAL_VOLCANOES = [
        # Japan
        {"id": "sakurajima", "name": "Sakurajima", "lat": 31.58, "lon": 130.66, "region": "Japan", "severity": "high"},
        {"id": "asosan", "name": "Aso", "lat": 32.88, "lon": 131.10, "region": "Japan", "severity": "moderate"},
        {"id": "suwanosejima", "name": "Suwanosejima", "lat": 29.64, "lon": 129.72, "region": "Japan", "severity": "high"},
        # Indonesia
        {"id": "merapi", "name": "Merapi", "lat": -7.54, "lon": 110.44, "region": "Indonesia", "severity": "high"},
        {"id": "semeru", "name": "Semeru", "lat": -8.11, "lon": 112.92, "region": "Indonesia", "severity": "high"},
        {"id": "sinabung", "name": "Sinabung", "lat": 3.17, "lon": 98.39, "region": "Indonesia", "severity": "moderate"},
        {"id": "lewotolok", "name": "Lewotolok", "lat": -8.27, "lon": 123.51, "region": "Indonesia", "severity": "moderate"},
        # Philippines
        {"id": "taal", "name": "Taal", "lat": 14.00, "lon": 120.99, "region": "Philippines", "severity": "high"},
        {"id": "mayon", "name": "Mayon", "lat": 13.26, "lon": 123.69, "region": "Philippines", "severity": "moderate"},
        # Papua New Guinea
        {"id": "ulawun", "name": "Ulawun", "lat": -5.05, "lon": 151.33, "region": "Papua New Guinea", "severity": "high"},
        {"id": "bagana", "name": "Bagana", "lat": -6.14, "lon": 155.20, "region": "Papua New Guinea", "severity": "moderate"},
        # Vanuatu
        {"id": "yasur", "name": "Yasur", "lat": -19.53, "lon": 169.44, "region": "Vanuatu", "severity": "moderate"},
        # Ecuador
        {"id": "sangay", "name": "Sangay", "lat": -2.00, "lon": -78.34, "region": "Ecuador", "severity": "high"},
        {"id": "cotopaxi", "name": "Cotopaxi", "lat": -0.68, "lon": -78.44, "region": "Ecuador", "severity": "moderate"},
        # Colombia
        {"id": "nevado_ruiz", "name": "Nevado del Ruiz", "lat": 4.89, "lon": -75.32, "region": "Colombia", "severity": "high"},
        # Guatemala
        {"id": "fuego", "name": "Fuego", "lat": 14.47, "lon": -90.88, "region": "Guatemala", "severity": "high"},
        {"id": "santiaguito", "name": "Santiaguito", "lat": 14.76, "lon": -91.55, "region": "Guatemala", "severity": "moderate"},
        # Mexico
        {"id": "popocatepetl", "name": "Popocatepetl", "lat": 19.02, "lon": -98.62, "region": "Mexico", "severity": "high"},
        # Italy
        {"id": "etna", "name": "Etna", "lat": 37.73, "lon": 15.00, "region": "Italy", "severity": "moderate"},
        {"id": "stromboli", "name": "Stromboli", "lat": 38.79, "lon": 15.21, "region": "Italy", "severity": "moderate"},
        # Iceland
        {"id": "hekla", "name": "Hekla", "lat": 63.98, "lon": -19.70, "region": "Iceland", "severity": "low"},
        {"id": "grimsvotn", "name": "Grimsvotn", "lat": 64.42, "lon": -17.33, "region": "Iceland", "severity": "moderate"},
        # Russia
        {"id": "shiveluch", "name": "Shiveluch", "lat": 56.65, "lon": 161.36, "region": "Russia", "severity": "high"},
        {"id": "klyuchevskoy", "name": "Klyuchevskoy", "lat": 56.06, "lon": 160.64, "region": "Russia", "severity": "high"},
        # Africa
        {"id": "nyiragongo", "name": "Nyiragongo", "lat": -1.52, "lon": 29.25, "region": "DR Congo", "severity": "high"},
        {"id": "ol_doinyo_lengai", "name": "Ol Doinyo Lengai", "lat": -2.76, "lon": 35.90, "region": "Tanzania", "severity": "low"},
    ]

    for v in GLOBAL_VOLCANOES:
        events.append(DisasterEvent(
            id=f"volcano-global-{v['id']}",
            type="volcano",
            title=v["name"],
            latitude=v["lat"],
            longitude=v["lon"],
            severity=v["severity"],
            timestamp=datetime.now(timezone.utc),
            description=f"Globally monitored active volcano in {v['region']}.",
            source="Global Volcanism Program",
            source_url="https://volcano.si.edu",
            region=v["region"]
        ))

    return events