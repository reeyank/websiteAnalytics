from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from database import get_db
from security import decode_token, hash_api_key

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


async def get_site_from_api_key(
    api_key: str,
    db: Session = Depends(get_db)
) -> tuple[dict, dict]:
    """Validate API key and return associated website and api_key record"""
    key_hash = hash_api_key(api_key)

    # Query API key
    api_key_record = db.execute(
        text("""
            SELECT * FROM api_keys FINAL
            WHERE key_hash = :hash
            AND revoked_at = toDateTime(0)
            AND (expires_at = toDateTime(0) OR expires_at > now())
        """),
        {"hash": key_hash}
    ).fetchone()

    if not api_key_record:
        raise HTTPException(status_code=401, detail="Invalid API key")

    api_key_dict = dict(api_key_record._mapping)

    # Query website
    website = db.execute(
        text("SELECT * FROM websites FINAL WHERE site_id = :sid AND is_deleted = 0"),
        {"sid": api_key_dict["site_id"]}
    ).fetchone()

    if not website:
        raise HTTPException(status_code=404, detail="Website not found")

    return dict(website._mapping), api_key_dict


def verify_site_ownership(user_id: str, site_id: str, db: Session) -> dict:
    """Verify that a user owns a website"""
    website = db.execute(
        text("SELECT * FROM websites FINAL WHERE site_id = :sid AND user_id = :uid AND is_deleted = 0"),
        {"sid": site_id, "uid": user_id}
    ).fetchone()

    if not website:
        raise HTTPException(status_code=404, detail="Website not found")

    return dict(website._mapping)
