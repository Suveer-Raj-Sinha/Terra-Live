from fastapi import APIRouter, Query
from app.models.event import EventsResponse
from app.services import db
from datetime import datetime, timezone

router = APIRouter(prefix="/earthquakes", tags=["Earthquakes"])

@router.get("", response_model=EventsResponse)
async def get_earthquakes(
    days: int = Query(7, ge=1, le=30),
    min_magnitude: float = Query(2.5, ge=0, le=10),
    limit: int = Query(200, ge=1, le=1000),
):
    events = db.get_events(
        types=["earthquake"],
        min_magnitude=min_magnitude,
        days=days,
        limit=limit
    )
    return EventsResponse(
        events=events,
        total=len(events),
        fetched_at=datetime.now(timezone.utc)
    )