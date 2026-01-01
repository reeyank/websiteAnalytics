from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, insert
from datetime import datetime
import uuid

from ..database import get_db
from ..models import Website
from ..dependencies import get_current_user, verify_site_ownership
from pydantic import BaseModel
from typing import List

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


class WebsiteWithScript(WebsiteResponse):
    script_tag: str


# =============================================================================
# WEBSITE ENDPOINTS
# =============================================================================

@router.post("/", response_model=WebsiteResponse)
async def create_website(
    website_data: WebsiteCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new website"""
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

    conn.commit()

    return WebsiteResponse(
        site_id=site_id,
        name=website_data.name,
        domain=website_data.domain,
        created_at=now
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
    script_tag = f'<script src="https://api.publickeyboard.com/script.js" data-site-id="{site_id}"></script>'

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
