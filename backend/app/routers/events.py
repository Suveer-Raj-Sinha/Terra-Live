from fastapi import APIRouter, Query
from app.models.event import EventsResponse
from app.services import db
from datetime import datetime, timezone

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("", response_model=EventsResponse)
async def get_all_events(
    days: int = Query(7, ge=1, le=30),
    min_magnitude: float = Query(2.5, ge=0),
    types: str = Query("earthquake,wildfire,volcano", description="Comma-separated types to include"),
    limit: int = Query(200, ge=1, le=1000, description="Max events to return per type"),
):
    requested_types = [t.strip() for t in types.split(",")]
    
    events = db.get_events(
        types=requested_types,
        min_magnitude=min_magnitude,
        days=days,
        limit=limit
    )

    return EventsResponse(
        events=events,
        total=len(events),
        fetched_at=datetime.now(timezone.utc)
    )