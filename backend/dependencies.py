from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from .database import get_db
from .security import decode_token

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """Validate JWT and return current user"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")

    # Query with FINAL to get latest row from ReplacingMergeTree
    result = db.execute(
        text("SELECT * FROM users FINAL WHERE user_id = :uid AND is_deleted = 0"),
        {"uid": user_id}
    ).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="User not found")

    return dict(result._mapping)


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[dict]:
    """Optionally get current user (for public endpoints that support auth)"""
    if not credentials:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


def verify_site_ownership(user_id: str, site_id: str, db: Session) -> dict:
    """Verify that a user owns a website"""
    website = db.execute(
        text("SELECT * FROM websites FINAL WHERE site_id = :sid AND user_id = :uid AND is_deleted = 0"),
        {"sid": site_id, "uid": user_id}
    ).fetchone()

    if not website:
        raise HTTPException(status_code=404, detail="Website not found")

    return dict(website._mapping)
