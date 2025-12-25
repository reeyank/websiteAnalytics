from pydantic import BaseModel
from typing import Optional, Dict, Any, List


class PageSchema(BaseModel):
    url: str
    path: str
    title: Optional[str] = None
    referrer: Optional[str] = None


class ViewportSchema(BaseModel):
    width: int
    height: int


class EventSchema(BaseModel):
    type: str
    timestamp: int
    sessionId: str
    visitorId: str
    page: PageSchema
    viewport: ViewportSchema

    # Optional fields that vary by event type
    # Click events
    element: Optional[Dict[str, Any]] = None
    position: Optional[Dict[str, Any]] = None

    # Scroll events
    depth: Optional[int] = None

    # Form interaction
    eventType: Optional[str] = None

    # Visibility
    state: Optional[str] = None
    hidden: Optional[bool] = None

    # Error events
    message: Optional[str] = None
    source: Optional[str] = None
    line: Optional[int] = None
    column: Optional[int] = None
    stack: Optional[str] = None

    # Page exit
    timeOnPage: Optional[int] = None
    engagementTime: Optional[int] = None
    scrollDepth: Optional[int] = None

    # Identify
    userId: Optional[str] = None
    traits: Optional[Dict[str, Any]] = None

    # Pageview
    isNewVisitor: Optional[bool] = None
    pageViewNumber: Optional[int] = None

    # Custom events
    custom: Optional[Dict[str, Any]] = None

    class Config:
        extra = "allow"  # Allow additional fields we haven't explicitly defined


class MetaSchema(BaseModel):
    userAgent: str
    language: str
    platform: str
    screenResolution: str


class AnalyticsPayloadSchema(BaseModel):
    events: List[EventSchema]
    meta: MetaSchema
    site_id: Optional[str] = None  # Can be passed at payload level or via X-Site-ID header
