from fastapi import APIRouter, Query
from app.models.event import EventsResponse
from app.services import db
from datetime import datetime, timezone

router = APIRouter(prefix="/storms", tags=["Storms"])

@router.get("", response_model=EventsResponse)
async def get_storms(
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(200, ge=1, le=1000),
):
    events = db.get_events(
        types=["storm"],
        min_magnitude=0.0,
        days=days,
        limit=limit
    )
    return EventsResponse(
        events=events,
        total=len(events),
        fetched_at=datetime.now(timezone.utc)
    )
