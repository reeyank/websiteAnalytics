from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base
from clickhouse_sqlalchemy import engines


# =============================================================================
# AUTH MODELS
# =============================================================================

class User(Base):
    """User accounts"""
    __tablename__ = "users"
    __table_args__ = (
        engines.ReplacingMergeTree(
            order_by='user_id',
            version='updated_at'
        ),
    )

    user_id = Column(String, primary_key=True)
    email = Column(String)
    email_verified = Column(Integer, default=0)
    password_hash = Column(String, default="")
    name = Column(String, default="")
    avatar_url = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    is_deleted = Column(Integer, default=0)


class OAuthAccount(Base):
    """OAuth provider accounts linked to users"""
    __tablename__ = "oauth_accounts"
    __table_args__ = (
        engines.ReplacingMergeTree(
            order_by=['provider', 'provider_account_id'],
            version='updated_at'
        ),
    )

    id = Column(String, primary_key=True)
    user_id = Column(String)
    provider = Column(String)  # 'google', 'github'
    provider_account_id = Column(String)
    access_token = Column(String, default="")
    refresh_token = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class AuthSession(Base):
    """JWT refresh token sessions"""
    __tablename__ = "auth_sessions"
    __table_args__ = (
        engines.ReplacingMergeTree(
            order_by='session_id',
            version='updated_at'
        ),
    )

    session_id = Column(String, primary_key=True)
    user_id = Column(String)
    token_hash = Column(String)
    user_agent = Column(String, default="")
    ip_address = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    revoked_at = Column(DateTime, default=datetime(1970, 1, 1, 0, 0, 0))
    updated_at = Column(DateTime, default=datetime.utcnow)


# =============================================================================
# WEBSITE/PROJECT MODELS
# =============================================================================

class Website(Base):
    """Websites/projects tracked by users"""
    __tablename__ = "websites"
    __table_args__ = (
        engines.ReplacingMergeTree(
            order_by='site_id',
            version='updated_at'
        ),
    )

    site_id = Column(String, primary_key=True)
    user_id = Column(String)
    name = Column(String)
    domain = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    is_deleted = Column(Integer, default=0)


class ApiKey(Base):
    """API keys for website tracking"""
    __tablename__ = "api_keys"
    __table_args__ = (
        engines.ReplacingMergeTree(
            order_by='key_id',
            version='updated_at'
        ),
    )

    key_id = Column(String, primary_key=True)
    site_id = Column(String)
    user_id = Column(String)
    key_hash = Column(String)
    key_prefix = Column(String)  # "wa_xxxx..." for display
    name = Column(String, default="Default")
    permissions = Column(String, default="write")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, default=datetime(1970, 1, 1, 0, 0, 0))
    expires_at = Column(DateTime, default=datetime(1970, 1, 1, 0, 0, 0))
    revoked_at = Column(DateTime, default=datetime(1970, 1, 1, 0, 0, 0))
    updated_at = Column(DateTime, default=datetime.utcnow)


# =============================================================================
# ANALYTICS MODELS (with site_id for multi-tenancy)
# =============================================================================

class AnalyticsEvent(Base):
    """Unified table for all analytics events"""
    __tablename__ = "analytics_events"
    __table_args__ = (
        engines.MergeTree(order_by=['site_id', 'timestamp']),
    )

    id = Column(Integer, primary_key=True)
    site_id = Column(String)  # Multi-tenancy
    session_id = Column(String)
    visitor_id = Column(String)
    event_type = Column(String)  # pageview, click, scroll, etc.
    timestamp = Column(DateTime)

    # Page info
    page_url = Column(String)
    page_path = Column(String)
    page_title = Column(String, default="")
    page_referrer = Column(String, default="")

    # Viewport
    viewport_width = Column(Integer)
    viewport_height = Column(Integer)

    # Event-specific data stored as JSON string
    event_data = Column(String, default="")

    created_at = Column(DateTime, default=datetime.utcnow)


class SessionMeta(Base):
    """Stores metadata for each session"""
    __tablename__ = "session_meta"
    __table_args__ = (
        engines.ReplacingMergeTree(
            order_by=['site_id', 'session_id'],
            version='last_seen'
        ),
    )

    id = Column(Integer, primary_key=True)
    site_id = Column(String)  # Multi-tenancy
    session_id = Column(String)
    visitor_id = Column(String)
    user_agent = Column(String, default="")
    language = Column(String, default="")
    platform = Column(String, default="")
    screen_resolution = Column(String, default="")
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="active")
    duration_ms = Column(Integer, default=0)
    engagement_time_ms = Column(Integer, default=0)
    final_scroll_depth = Column(Integer, default=0)
    event_count = Column(Integer, default=0)


class MouseHeatmap(Base):
    """Aggregated mouse position data for heatmaps"""
    __tablename__ = "mouse_heatmap"
    __table_args__ = (
        engines.MergeTree(order_by=['site_id', 'session_id']),
    )

    id = Column(Integer, primary_key=True)
    site_id = Column(String)  # Multi-tenancy
    session_id = Column(String)
    page_url = Column(String)
    x = Column(Integer)
    y = Column(Integer)
    count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
