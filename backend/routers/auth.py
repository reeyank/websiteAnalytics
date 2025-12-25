from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import text, insert
from datetime import datetime, timedelta
import uuid

from database import get_db
from models import User, AuthSession
from security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token
)
from dependencies import get_current_user
from config import settings
from pydantic import BaseModel, EmailStr
from typing import Optional

router = APIRouter(prefix="/auth", tags=["auth"])


# =============================================================================
# SCHEMAS
# =============================================================================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    avatar_url: str
    email_verified: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/signup", response_model=TokenResponse)
async def signup(
    user_data: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Register a new user with email and password"""
    email = user_data.email.lower()

    # Check if email exists
    existing = db.execute(
        text("SELECT user_id FROM users FINAL WHERE email = :email AND is_deleted = 0"),
        {"email": email}
    ).fetchone()

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    now = datetime.utcnow()

    # Insert new user
    conn = db.connection()
    conn.execute(
        insert(User),
        [{
            "user_id": user_id,
            "email": email,
            "email_verified": 0,
            "password_hash": hash_password(user_data.password),
            "name": user_data.name or "",
            "avatar_url": "",
            "created_at": now,
            "updated_at": now,
            "is_deleted": 0
        }]
    )

    # Generate tokens
    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})

    # Store refresh token session
    session_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    conn.execute(
        insert(AuthSession),
        [{
            "session_id": session_id,
            "user_id": user_id,
            "token_hash": hash_token(refresh_token),
            "user_agent": request.headers.get("user-agent", ""),
            "ip_address": request.client.host if request.client else "",
            "created_at": now,
            "expires_at": expires_at,
            "revoked_at": datetime(1970, 1, 1, 0, 0, 0),
            "updated_at": now
        }]
    )

    conn.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            user_id=user_id,
            email=email,
            name=user_data.name or "",
            avatar_url="",
            email_verified=False,
            created_at=now
        )
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    """Login with email and password"""
    email = credentials.email.lower()

    user = db.execute(
        text("SELECT * FROM users FINAL WHERE email = :email AND is_deleted = 0"),
        {"email": email}
    ).fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_dict = dict(user._mapping)

    if not user_dict.get("password_hash") or not verify_password(credentials.password, user_dict["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id = user_dict["user_id"]
    now = datetime.utcnow()

    # Generate tokens
    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})

    # Store refresh token session
    session_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    conn = db.connection()
    conn.execute(
        insert(AuthSession),
        [{
            "session_id": session_id,
            "user_id": user_id,
            "token_hash": hash_token(refresh_token),
            "user_agent": request.headers.get("user-agent", ""),
            "ip_address": request.client.host if request.client else "",
            "created_at": now,
            "expires_at": expires_at,
            "revoked_at": datetime(1970, 1, 1, 0, 0, 0),
            "updated_at": now
        }]
    )
    conn.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            user_id=user_id,
            email=user_dict["email"],
            name=user_dict.get("name", ""),
            avatar_url=user_dict.get("avatar_url", ""),
            email_verified=bool(user_dict.get("email_verified", 0)),
            created_at=user_dict["created_at"]
        )
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    request_data: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    payload = decode_token(request_data.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    token_hash = hash_token(request_data.refresh_token)
    user_id = payload.get("sub")

    # Verify session is not revoked
    session = db.execute(
        text("""
            SELECT * FROM auth_sessions FINAL
            WHERE token_hash = :hash
            AND user_id = :uid
            AND revoked_at = toDateTime(0)
            AND expires_at > now()
        """),
        {"hash": token_hash, "uid": user_id}
    ).fetchone()

    if not session:
        raise HTTPException(status_code=401, detail="Session expired or revoked")

    # Get user
    user = db.execute(
        text("SELECT * FROM users FINAL WHERE user_id = :uid AND is_deleted = 0"),
        {"uid": user_id}
    ).fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_dict = dict(user._mapping)

    # Generate new access token (keep same refresh token)
    new_access_token = create_access_token({"sub": user_id})

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=request_data.refresh_token,
        user=UserResponse(
            user_id=user_id,
            email=user_dict["email"],
            name=user_dict.get("name", ""),
            avatar_url=user_dict.get("avatar_url", ""),
            email_verified=bool(user_dict.get("email_verified", 0)),
            created_at=user_dict["created_at"]
        )
    )


@router.post("/logout")
async def logout(
    request_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Logout - revoke refresh token session"""
    payload = decode_token(request_data.refresh_token)

    if not payload:
        return {"message": "Logged out successfully"}

    token_hash = hash_token(request_data.refresh_token)
    user_id = payload.get("sub")
    now = datetime.utcnow()

    # Get current session
    session = db.execute(
        text("""
            SELECT * FROM auth_sessions FINAL
            WHERE token_hash = :hash AND user_id = :uid
        """),
        {"hash": token_hash, "uid": user_id}
    ).fetchone()

    if session:
        session_dict = dict(session._mapping)
        # Insert new row with revoked_at set (ReplacingMergeTree pattern)
        conn = db.connection()
        conn.execute(
            insert(AuthSession),
            [{
                "session_id": session_dict["session_id"],
                "user_id": session_dict["user_id"],
                "token_hash": session_dict["token_hash"],
                "user_agent": session_dict["user_agent"],
                "ip_address": session_dict["ip_address"],
                "created_at": session_dict["created_at"],
                "expires_at": session_dict["expires_at"],
                "revoked_at": now,
                "updated_at": now
            }]
        )
        conn.commit()

    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(
        user_id=current_user["user_id"],
        email=current_user["email"],
        name=current_user.get("name", ""),
        avatar_url=current_user.get("avatar_url", ""),
        email_verified=bool(current_user.get("email_verified", 0)),
        created_at=current_user["created_at"]
    )
