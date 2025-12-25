from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, insert
import httpx
import uuid
from datetime import datetime, timedelta

from database import get_db
from models import User, OAuthAccount, AuthSession
from security import create_access_token, create_refresh_token, hash_token
from config import settings

router = APIRouter(prefix="/auth/oauth", tags=["oauth"])


# =============================================================================
# GOOGLE OAUTH
# =============================================================================

@router.get("/google")
async def google_login():
    """Redirect to Google OAuth"""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.BACKEND_URL}/auth/oauth/google/callback"
        f"&response_type=code"
        f"&scope=email%20profile"
        f"&access_type=offline"
        f"&prompt=consent"
    )
    return RedirectResponse(url=google_auth_url)


@router.get("/google/callback")
async def google_callback(
    code: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback"""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    async with httpx.AsyncClient() as client:
        # Exchange code for tokens
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": f"{settings.BACKEND_URL}/auth/oauth/google/callback",
                "grant_type": "authorization_code"
            }
        )

        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for tokens")

        tokens = token_response.json()

        # Get user info
        user_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )

        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")

        user_info = user_response.json()

    now = datetime.utcnow()
    conn = db.connection()

    # Check if OAuth account exists
    oauth_account = db.execute(
        text("""
            SELECT * FROM oauth_accounts FINAL
            WHERE provider = 'google' AND provider_account_id = :pid
        """),
        {"pid": str(user_info["id"])}
    ).fetchone()

    if oauth_account:
        # Existing user - get user_id
        oauth_dict = dict(oauth_account._mapping)
        user_id = oauth_dict["user_id"]

        # Update OAuth tokens
        conn.execute(
            insert(OAuthAccount),
            [{
                "id": oauth_dict["id"],
                "user_id": user_id,
                "provider": "google",
                "provider_account_id": str(user_info["id"]),
                "access_token": tokens.get("access_token", ""),
                "refresh_token": tokens.get("refresh_token", oauth_dict.get("refresh_token", "")),
                "created_at": oauth_dict["created_at"],
                "updated_at": now
            }]
        )
    else:
        # Check if email exists (link accounts)
        existing_user = db.execute(
            text("SELECT * FROM users FINAL WHERE email = :email AND is_deleted = 0"),
            {"email": user_info["email"]}
        ).fetchone()

        if existing_user:
            user_id = dict(existing_user._mapping)["user_id"]
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            conn.execute(
                insert(User),
                [{
                    "user_id": user_id,
                    "email": user_info["email"],
                    "email_verified": 1,
                    "password_hash": "",
                    "name": user_info.get("name", ""),
                    "avatar_url": user_info.get("picture", ""),
                    "created_at": now,
                    "updated_at": now,
                    "is_deleted": 0
                }]
            )

        # Link OAuth account
        conn.execute(
            insert(OAuthAccount),
            [{
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "provider": "google",
                "provider_account_id": str(user_info["id"]),
                "access_token": tokens.get("access_token", ""),
                "refresh_token": tokens.get("refresh_token", ""),
                "created_at": now,
                "updated_at": now
            }]
        )

    # Generate JWT tokens
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

    # Redirect to frontend with tokens
    redirect_url = f"{settings.FRONTEND_URL}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
    return RedirectResponse(url=redirect_url)


# =============================================================================
# GITHUB OAUTH
# =============================================================================

@router.get("/github")
async def github_login():
    """Redirect to GitHub OAuth"""
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")

    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={settings.BACKEND_URL}/auth/oauth/github/callback"
        f"&scope=user:email"
    )
    return RedirectResponse(url=github_auth_url)


@router.get("/github/callback")
async def github_callback(
    code: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle GitHub OAuth callback"""
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")

    async with httpx.AsyncClient() as client:
        # Exchange code for tokens
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "code": code,
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "redirect_uri": f"{settings.BACKEND_URL}/auth/oauth/github/callback"
            },
            headers={"Accept": "application/json"}
        )

        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for tokens")

        tokens = token_response.json()

        if "error" in tokens:
            raise HTTPException(status_code=400, detail=tokens.get("error_description", "OAuth error"))

        # Get user info
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {tokens['access_token']}",
                "Accept": "application/json"
            }
        )

        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")

        user_info = user_response.json()

        # Get user email (may need separate request if email is private)
        email = user_info.get("email")
        if not email:
            emails_response = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {tokens['access_token']}",
                    "Accept": "application/json"
                }
            )
            if emails_response.status_code == 200:
                emails = emails_response.json()
                primary_email = next((e for e in emails if e.get("primary")), None)
                if primary_email:
                    email = primary_email["email"]

        if not email:
            raise HTTPException(status_code=400, detail="Could not get email from GitHub")

    now = datetime.utcnow()
    conn = db.connection()

    # Check if OAuth account exists
    oauth_account = db.execute(
        text("""
            SELECT * FROM oauth_accounts FINAL
            WHERE provider = 'github' AND provider_account_id = :pid
        """),
        {"pid": str(user_info["id"])}
    ).fetchone()

    if oauth_account:
        # Existing user - get user_id
        oauth_dict = dict(oauth_account._mapping)
        user_id = oauth_dict["user_id"]

        # Update OAuth tokens
        conn.execute(
            insert(OAuthAccount),
            [{
                "id": oauth_dict["id"],
                "user_id": user_id,
                "provider": "github",
                "provider_account_id": str(user_info["id"]),
                "access_token": tokens.get("access_token", ""),
                "refresh_token": tokens.get("refresh_token", ""),
                "created_at": oauth_dict["created_at"],
                "updated_at": now
            }]
        )
    else:
        # Check if email exists (link accounts)
        existing_user = db.execute(
            text("SELECT * FROM users FINAL WHERE email = :email AND is_deleted = 0"),
            {"email": email}
        ).fetchone()

        if existing_user:
            user_id = dict(existing_user._mapping)["user_id"]
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            conn.execute(
                insert(User),
                [{
                    "user_id": user_id,
                    "email": email,
                    "email_verified": 1,
                    "password_hash": "",
                    "name": user_info.get("name") or user_info.get("login", ""),
                    "avatar_url": user_info.get("avatar_url", ""),
                    "created_at": now,
                    "updated_at": now,
                    "is_deleted": 0
                }]
            )

        # Link OAuth account
        conn.execute(
            insert(OAuthAccount),
            [{
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "provider": "github",
                "provider_account_id": str(user_info["id"]),
                "access_token": tokens.get("access_token", ""),
                "refresh_token": tokens.get("refresh_token", ""),
                "created_at": now,
                "updated_at": now
            }]
        )

    # Generate JWT tokens
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

    # Redirect to frontend with tokens
    redirect_url = f"{settings.FRONTEND_URL}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
    return RedirectResponse(url=redirect_url)
