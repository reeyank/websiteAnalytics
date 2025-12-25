from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text, insert
from datetime import datetime
from collections import defaultdict
import json
import os

from database import engine, get_db, Base
from models import AnalyticsEvent, SessionMeta, MouseHeatmap
from schemas import AnalyticsPayloadSchema
from routers import auth_router, oauth_router, websites_router
from dependencies import get_current_user

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not initialize database tables: {e}")
    print("Application will continue without database initialization")

app = FastAPI(title="Website Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(oauth_router)
app.include_router(websites_router)


@app.get("/health")
def health_check():
    """Health check endpoint for Railway"""
    return {"status": "healthy", "service": "website-analytics-api"}

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# In-memory counter for mouse movement sampling (per session)
mouse_sample_counters = defaultdict(int)
MOUSE_SAMPLE_RATE = 5  # Store every 5th mouse movement


@app.get("/")
def read_root():
    from fastapi.responses import FileResponse
    index_path = os.path.join(project_root, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "message": "Website Analytics API",
        "version": "3.0.0",
        "endpoints": {
            "auth": {
                "signup": "POST /auth/signup",
                "login": "POST /auth/login",
                "refresh": "POST /auth/refresh",
                "logout": "POST /auth/logout",
                "me": "GET /auth/me"
            },
            "oauth": {
                "google": "GET /auth/oauth/google",
                "github": "GET /auth/oauth/github"
            },
            "websites": {
                "list": "GET /websites",
                "create": "POST /websites",
                "get": "GET /websites/{site_id}",
                "delete": "DELETE /websites/{site_id}"
            },
            "analytics": "POST /api/analytics - Collect batched analytics events",
            "stats": "GET /stats?site_id= - Get site statistics",
            "sessions": "GET /sessions?site_id= - List sessions",
            "heatmap": "GET /heatmap/{session_id} - Get mouse heatmap data"
        }
    }


@app.post("/api/analytics")
async def collect_analytics(
    request: Request,
    payload: AnalyticsPayloadSchema,
    db: Session = Depends(get_db)
):
    """Collect batched analytics events from the tracking script"""
    try:
        # Get site_id from header or payload
        site_id = request.headers.get("X-Site-ID") or payload.site_id

        if not site_id:
            raise HTTPException(status_code=400, detail="site_id is required. Pass as X-Site-ID header or in payload.")

        # Validate site_id exists
        website = db.execute(
            text("SELECT site_id FROM websites FINAL WHERE site_id = :sid AND is_deleted = 0"),
            {"sid": site_id}
        ).fetchone()

        if not website:
            raise HTTPException(status_code=404, detail="Invalid site_id")

        events_stored = 0
        mouse_events_sampled = 0
        now = datetime.utcnow()

        # Batch collect inserts for efficiency
        session_inserts = []
        event_inserts = []
        heatmap_inserts = []
        sessions_seen = set()

        for event in payload.events:
            session_id = event.sessionId
            visitor_id = event.visitorId

            # Check if session exists (only query once per session in batch)
            if session_id not in sessions_seen:
                sessions_seen.add(session_id)
                existing_session = db.execute(
                    text("SELECT session_id FROM session_meta FINAL WHERE site_id = :sid AND session_id = :sess_id"),
                    {"sid": site_id, "sess_id": session_id}
                ).fetchone()

                # For ClickHouse, we only insert a session record on first event
                if not existing_session:
                    session_inserts.append({
                        "site_id": site_id,
                        "session_id": session_id,
                        "visitor_id": visitor_id,
                        "user_agent": payload.meta.userAgent or "",
                        "language": payload.meta.language or "",
                        "platform": payload.meta.platform or "",
                        "screen_resolution": payload.meta.screenResolution or "",
                        "first_seen": now,
                        "last_seen": now,
                        "status": "active",
                        "duration_ms": 0,
                        "engagement_time_ms": 0,
                        "final_scroll_depth": 0,
                        "event_count": 1
                    })

            # Handle mouse movement events with sampling
            if event.type == "mousemove":
                mouse_sample_counters[session_id] += 1

                # Only store every Nth mouse movement
                if mouse_sample_counters[session_id] % MOUSE_SAMPLE_RATE != 0:
                    continue

                mouse_events_sampled += 1

                # Store in heatmap table
                if event.position:
                    heatmap_inserts.append({
                        "site_id": site_id,
                        "session_id": session_id,
                        "page_url": event.page.url,
                        "x": event.position.get("x", 0),
                        "y": event.position.get("y", 0),
                        "count": 1,
                        "created_at": now
                    })
                continue

            # Build event-specific data
            event_data = {}

            if event.type == "click":
                event_data = {
                    "element": event.element,
                    "position": event.position
                }
            elif event.type == "scroll":
                event_data = {
                    "depth": event.depth,
                    "position": event.position
                }
            elif event.type == "form_interaction":
                event_data = {
                    "eventType": event.eventType,
                    "element": event.element
                }
            elif event.type == "visibility":
                event_data = {
                    "state": event.state,
                    "hidden": event.hidden
                }
            elif event.type == "error":
                event_data = {
                    "message": event.message,
                    "source": event.source,
                    "line": event.line,
                    "column": event.column,
                    "stack": event.stack
                }
            elif event.type == "page_exit":
                event_data = {
                    "timeOnPage": event.timeOnPage,
                    "engagementTime": event.engagementTime,
                    "scrollDepth": event.scrollDepth
                }
            elif event.type == "identify":
                event_data = {
                    "userId": event.userId,
                    "traits": event.traits
                }
            elif event.type == "pageview":
                event_data = {
                    "isNewVisitor": event.isNewVisitor,
                    "pageViewNumber": event.pageViewNumber
                }
            elif event.type.startswith("custom:"):
                event_data = {
                    "eventName": event.type.replace("custom:", ""),
                    "custom": event.custom
                }

            # Prepare event insert
            event_inserts.append({
                "site_id": site_id,
                "session_id": session_id,
                "visitor_id": visitor_id,
                "event_type": event.type,
                "timestamp": datetime.fromtimestamp(event.timestamp / 1000),
                "page_url": event.page.url,
                "page_path": event.page.path,
                "page_title": event.page.title or "",
                "page_referrer": event.page.referrer or "",
                "viewport_width": event.viewport.width,
                "viewport_height": event.viewport.height,
                "event_data": json.dumps(event_data) if event_data else "",
                "created_at": now
            })
            events_stored += 1

        # Execute batch inserts using Core insert (works with ClickHouse)
        conn = db.connection()

        if session_inserts:
            conn.execute(insert(SessionMeta), session_inserts)

        if event_inserts:
            conn.execute(insert(AnalyticsEvent), event_inserts)

        if heatmap_inserts:
            conn.execute(insert(MouseHeatmap), heatmap_inserts)

        conn.commit()

        return {
            "status": "success",
            "events_stored": events_stored,
            "mouse_events_sampled": mouse_events_sampled
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
def get_stats(
    site_id: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get statistics for a site (requires authentication)"""
    try:
        from sqlalchemy import func
        import math

        if not site_id:
            raise HTTPException(status_code=400, detail="site_id query parameter is required")

        # Verify user owns the site
        website = db.execute(
            text("SELECT * FROM websites FINAL WHERE site_id = :sid AND user_id = :uid AND is_deleted = 0"),
            {"sid": site_id, "uid": current_user["user_id"]}
        ).fetchone()

        if not website:
            raise HTTPException(status_code=404, detail="Website not found")

        # Get stats for this site
        total_events = db.query(AnalyticsEvent).filter(
            AnalyticsEvent.site_id == site_id
        ).count()

        total_sessions = db.query(SessionMeta).filter(
            SessionMeta.site_id == site_id
        ).count()

        total_heatmap_points = db.query(MouseHeatmap).filter(
            MouseHeatmap.site_id == site_id
        ).count()

        active_sessions = db.query(SessionMeta).filter(
            SessionMeta.site_id == site_id,
            SessionMeta.status == "active"
        ).count()

        ended_sessions = db.query(SessionMeta).filter(
            SessionMeta.site_id == site_id,
            SessionMeta.status == "ended"
        ).count()

        event_counts = db.query(
            AnalyticsEvent.event_type,
            func.count(AnalyticsEvent.id)
        ).filter(
            AnalyticsEvent.site_id == site_id
        ).group_by(AnalyticsEvent.event_type).all()

        avg_duration = db.query(func.avg(SessionMeta.duration_ms)).filter(
            SessionMeta.site_id == site_id,
            SessionMeta.status == "ended",
            SessionMeta.duration_ms.isnot(None)
        ).scalar()

        avg_duration_ms = None
        if avg_duration is not None and not math.isnan(avg_duration):
            avg_duration_ms = int(avg_duration)

        return {
            "site_id": site_id,
            "total_events": total_events,
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "ended_sessions": ended_sessions,
            "heatmap_points": total_heatmap_points,
            "avg_session_duration_ms": avg_duration_ms,
            "events_by_type": {event_type: count for event_type, count in event_counts}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sessions/{session_id}")
def get_session_data(
    session_id: str,
    site_id: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all data for a specific session"""
    try:
        from sqlalchemy import func

        if not site_id:
            raise HTTPException(status_code=400, detail="site_id query parameter is required")

        # Verify user owns the site
        website = db.execute(
            text("SELECT * FROM websites FINAL WHERE site_id = :sid AND user_id = :uid AND is_deleted = 0"),
            {"sid": site_id, "uid": current_user["user_id"]}
        ).fetchone()

        if not website:
            raise HTTPException(status_code=404, detail="Website not found")

        session_meta = db.query(SessionMeta).filter(
            SessionMeta.site_id == site_id,
            SessionMeta.session_id == session_id
        ).first()

        if not session_meta:
            raise HTTPException(status_code=404, detail="Session not found")

        events = db.query(AnalyticsEvent).filter(
            AnalyticsEvent.site_id == site_id,
            AnalyticsEvent.session_id == session_id
        ).order_by(AnalyticsEvent.timestamp).all()

        heatmap_count = db.query(MouseHeatmap).filter(
            MouseHeatmap.site_id == site_id,
            MouseHeatmap.session_id == session_id
        ).count()

        event_counts = db.query(
            AnalyticsEvent.event_type,
            func.count(AnalyticsEvent.id)
        ).filter(
            AnalyticsEvent.site_id == site_id,
            AnalyticsEvent.session_id == session_id
        ).group_by(AnalyticsEvent.event_type).all()

        pages = db.query(AnalyticsEvent.page_url).filter(
            AnalyticsEvent.site_id == site_id,
            AnalyticsEvent.session_id == session_id
        ).distinct().all()

        return {
            "session_id": session_id,
            "site_id": site_id,
            "visitor_id": session_meta.visitor_id,
            "user_agent": session_meta.user_agent,
            "language": session_meta.language,
            "platform": session_meta.platform,
            "screen_resolution": session_meta.screen_resolution,
            "first_seen": session_meta.first_seen.isoformat() if session_meta.first_seen else None,
            "last_seen": session_meta.last_seen.isoformat() if session_meta.last_seen else None,
            "status": session_meta.status or "active",
            "duration_ms": session_meta.duration_ms,
            "engagement_time_ms": session_meta.engagement_time_ms,
            "final_scroll_depth": session_meta.final_scroll_depth,
            "total_events": len(events),
            "heatmap_points": heatmap_count,
            "events_by_type": {event_type: count for event_type, count in event_counts},
            "pages_visited": [p[0] for p in pages],
            "events": [
                {
                    "type": e.event_type,
                    "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                    "page_url": e.page_url,
                    "data": e.event_data
                }
                for e in events
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/heatmap/{session_id}")
def get_heatmap_data(
    session_id: str,
    site_id: str = None,
    page_url: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get mouse heatmap data for a session"""
    try:
        if not site_id:
            raise HTTPException(status_code=400, detail="site_id query parameter is required")

        # Verify user owns the site
        website = db.execute(
            text("SELECT * FROM websites FINAL WHERE site_id = :sid AND user_id = :uid AND is_deleted = 0"),
            {"sid": site_id, "uid": current_user["user_id"]}
        ).fetchone()

        if not website:
            raise HTTPException(status_code=404, detail="Website not found")

        query = db.query(MouseHeatmap).filter(
            MouseHeatmap.site_id == site_id,
            MouseHeatmap.session_id == session_id
        )

        if page_url:
            query = query.filter(MouseHeatmap.page_url == page_url)

        heatmap_data = query.all()

        # Aggregate points into buckets (10px grid)
        bucket_size = 10
        aggregated = defaultdict(int)

        for point in heatmap_data:
            bucket_x = (point.x // bucket_size) * bucket_size
            bucket_y = (point.y // bucket_size) * bucket_size
            aggregated[(bucket_x, bucket_y)] += point.count

        return {
            "session_id": session_id,
            "site_id": site_id,
            "page_url": page_url,
            "total_points": len(heatmap_data),
            "heatmap": [
                {"x": x, "y": y, "count": count}
                for (x, y), count in aggregated.items()
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sessions")
def list_sessions(
    site_id: str = None,
    limit: int = 50,
    status: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List sessions for a site"""
    try:
        if not site_id:
            raise HTTPException(status_code=400, detail="site_id query parameter is required")

        # Verify user owns the site
        website = db.execute(
            text("SELECT * FROM websites FINAL WHERE site_id = :sid AND user_id = :uid AND is_deleted = 0"),
            {"sid": site_id, "uid": current_user["user_id"]}
        ).fetchone()

        if not website:
            raise HTTPException(status_code=404, detail="Website not found")

        query = db.query(SessionMeta).filter(SessionMeta.site_id == site_id)

        if status:
            query = query.filter(SessionMeta.status == status)

        sessions = query.order_by(SessionMeta.last_seen.desc()).limit(limit).all()

        return {
            "site_id": site_id,
            "sessions": [
                {
                    "session_id": s.session_id,
                    "visitor_id": s.visitor_id,
                    "first_seen": s.first_seen.isoformat() if s.first_seen else None,
                    "last_seen": s.last_seen.isoformat() if s.last_seen else None,
                    "user_agent": s.user_agent,
                    "status": s.status or "active",
                    "duration_ms": s.duration_ms,
                    "engagement_time_ms": s.engagement_time_ms,
                    "event_count": s.event_count or 0
                }
                for s in sessions
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Serve static files (must be last to not interfere with API routes)
@app.get("/{filename:path}")
def serve_static(filename: str):
    from fastapi.responses import FileResponse
    if filename.endswith(('.html', '.js', '.css')):
        file_path = os.path.join(project_root, filename)
        if os.path.exists(file_path):
            if filename.endswith('.html'):
                return FileResponse(file_path, media_type="text/html")
            elif filename.endswith('.js'):
                return FileResponse(file_path, media_type="text/javascript")
            elif filename.endswith('.css'):
                return FileResponse(file_path, media_type="text/css")
    raise HTTPException(status_code=404, detail="File not found")
