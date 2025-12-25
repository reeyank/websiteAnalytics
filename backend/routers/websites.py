from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, insert
from datetime import datetime
import uuid

from ..database import get_db
from ..models import Website, ApiKey
from ..security import generate_api_key
from ..dependencies import get_current_user, verify_site_ownership
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/websites", tags=["websites"])


# =============================================================================
# SCHEMAS
# =============================================================================

class WebsiteCreate(BaseModel):
    name: str
    domain: str


class WebsiteResponse(BaseModel):
    site_id: str
    name: str
    domain: str
    created_at: datetime


class WebsiteWithApiKey(WebsiteResponse):
    api_key: str  # Only returned on creation!


class WebsiteWithScript(WebsiteResponse):
    script_tag: str


class ApiKeyCreate(BaseModel):
    name: Optional[str] = "Default"


class ApiKeyResponse(BaseModel):
    key_id: str
    site_id: str
    key_prefix: str
    name: str
    permissions: str
    created_at: datetime


class ApiKeyCreated(ApiKeyResponse):
    api_key: str  # Only returned on creation!


# =============================================================================
# WEBSITE ENDPOINTS
# =============================================================================

@router.post("/", response_model=WebsiteWithApiKey)
async def create_website(
    website_data: WebsiteCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new website and generate initial API key"""
    site_id = str(uuid.uuid4())
    user_id = current_user["user_id"]
    now = datetime.utcnow()

    conn = db.connection()

    # Create website
    conn.execute(
        insert(Website),
        [{
            "site_id": site_id,
            "user_id": user_id,
            "name": website_data.name,
            "domain": website_data.domain,
            "created_at": now,
            "updated_at": now,
            "is_deleted": 0
        }]
    )

    # Generate and store API key
    api_key, key_hash = generate_api_key()
    key_id = str(uuid.uuid4())

    conn.execute(
        insert(ApiKey),
        [{
            "key_id": key_id,
            "site_id": site_id,
            "user_id": user_id,
            "key_hash": key_hash,
            "key_prefix": api_key[:12] + "...",
            "name": "Default",
            "permissions": "write",
            "created_at": now,
            "last_used_at": datetime(1970, 1, 1, 0, 0, 0),
            "expires_at": datetime(1970, 1, 1, 0, 0, 0),
            "revoked_at": datetime(1970, 1, 1, 0, 0, 0),
            "updated_at": now
        }]
    )

    conn.commit()

    return WebsiteWithApiKey(
        site_id=site_id,
        name=website_data.name,
        domain=website_data.domain,
        created_at=now,
        api_key=api_key
    )


@router.get("/", response_model=List[WebsiteResponse])
async def list_websites(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all websites for current user"""
    websites = db.execute(
        text("""
            SELECT site_id, name, domain, created_at
            FROM websites FINAL
            WHERE user_id = :uid AND is_deleted = 0
            ORDER BY created_at DESC
        """),
        {"uid": current_user["user_id"]}
    ).fetchall()

    return [WebsiteResponse(**dict(w._mapping)) for w in websites]


@router.get("/{site_id}", response_model=WebsiteWithScript)
async def get_website(
    site_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get website details with script tag"""
    website = verify_site_ownership(current_user["user_id"], site_id, db)

    # Generate script tag
    script_tag = f'<script src="/script.js" data-site-id="{site_id}"></script>'

    return WebsiteWithScript(
        site_id=website["site_id"],
        name=website["name"],
        domain=website["domain"],
        created_at=website["created_at"],
        script_tag=script_tag
    )


@router.delete("/{site_id}")
async def delete_website(
    site_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft delete a website"""
    website = verify_site_ownership(current_user["user_id"], site_id, db)
    now = datetime.utcnow()

    # Insert new row with is_deleted = 1 (ReplacingMergeTree pattern)
    conn = db.connection()
    conn.execute(
        insert(Website),
        [{
            "site_id": site_id,
            "user_id": current_user["user_id"],
            "name": website["name"],
            "domain": website["domain"],
            "created_at": website["created_at"],
            "updated_at": now,
            "is_deleted": 1
        }]
    )
    conn.commit()

    return {"message": "Website deleted"}


# =============================================================================
# API KEY ENDPOINTS
# =============================================================================

@router.get("/{site_id}/api-keys", response_model=List[ApiKeyResponse])
async def list_api_keys(
    site_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List API keys for a website (only shows prefix, not full key)"""
    verify_site_ownership(current_user["user_id"], site_id, db)

    keys = db.execute(
        text("""
            SELECT key_id, site_id, key_prefix, name, permissions, created_at
            FROM api_keys FINAL
            WHERE site_id = :sid AND revoked_at = toDateTime(0)
            ORDER BY created_at DESC
        """),
        {"sid": site_id}
    ).fetchall()

    return [ApiKeyResponse(**dict(k._mapping)) for k in keys]


@router.post("/{site_id}/api-keys", response_model=ApiKeyCreated)
async def create_api_key(
    site_id: str,
    key_data: ApiKeyCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new API key for a website"""
    verify_site_ownership(current_user["user_id"], site_id, db)

    api_key, key_hash = generate_api_key()
    key_id = str(uuid.uuid4())
    now = datetime.utcnow()

    conn = db.connection()
    conn.execute(
        insert(ApiKey),
        [{
            "key_id": key_id,
            "site_id": site_id,
            "user_id": current_user["user_id"],
            "key_hash": key_hash,
            "key_prefix": api_key[:12] + "...",
            "name": key_data.name or "Default",
            "permissions": "write",
            "created_at": now,
            "last_used_at": datetime(1970, 1, 1, 0, 0, 0),
            "expires_at": datetime(1970, 1, 1, 0, 0, 0),
            "revoked_at": datetime(1970, 1, 1, 0, 0, 0),
            "updated_at": now
        }]
    )
    conn.commit()

    return ApiKeyCreated(
        key_id=key_id,
        site_id=site_id,
        key_prefix=api_key[:12] + "...",
        name=key_data.name or "Default",
        permissions="write",
        created_at=now,
        api_key=api_key
    )


@router.delete("/{site_id}/api-keys/{key_id}")
async def revoke_api_key(
    site_id: str,
    key_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke an API key"""
    verify_site_ownership(current_user["user_id"], site_id, db)

    # Get current key
    key = db.execute(
        text("""
            SELECT * FROM api_keys FINAL
            WHERE key_id = :kid AND site_id = :sid AND revoked_at = toDateTime(0)
        """),
        {"kid": key_id, "sid": site_id}
    ).fetchone()

    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    key_dict = dict(key._mapping)
    now = datetime.utcnow()

    # Insert new row with revoked_at set
    conn = db.connection()
    conn.execute(
        insert(ApiKey),
        [{
            "key_id": key_id,
            "site_id": site_id,
            "user_id": current_user["user_id"],
            "key_hash": key_dict["key_hash"],
            "key_prefix": key_dict["key_prefix"],
            "name": key_dict["name"],
            "permissions": key_dict["permissions"],
            "created_at": key_dict["created_at"],
            "last_used_at": key_dict["last_used_at"],
            "expires_at": key_dict["expires_at"],
            "revoked_at": now,
            "updated_at": now
        }]
    )
    conn.commit()

    return {"message": "API key revoked"}
