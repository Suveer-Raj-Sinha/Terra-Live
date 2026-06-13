from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DisasterEvent(BaseModel):
    id: str
    type: str
    title: str
    latitude: float
    longitude: float
    severity: str
    magnitude: Optional[float] = None
    depth_km: Optional[float] = None
    timestamp: datetime
    description: Optional[str] = None
    source: str
    source_url: Optional[str] = None
    region: Optional[str] = None

class EventsResponse(BaseModel):
    events: list[DisasterEvent]
    total: int
    fetched_at: datetime