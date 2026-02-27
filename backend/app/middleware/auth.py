# backend/app/middleware/auth.py
# JWT validation for Convex Auth tokens
# Validates Bearer tokens against Convex JWKS endpoint
# Related: main.py, config.py

import logging

import httpx
from jose import jwt, JWTError
from fastapi import Request, HTTPException
from app.config import get_settings

logger = logging.getLogger(__name__)

_jwks_cache: dict | None = None


async def get_jwks() -> dict:
    """Fetch and cache JWKS from Convex deployment."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache

    settings = get_settings()
    # JWKS is served from .convex.site, not .convex.cloud
    base_url = settings.convex_url.replace(".convex.cloud", ".convex.site")
    jwks_url = f"{base_url}/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        response = await client.get(jwks_url)
        response.raise_for_status()
        _jwks_cache = response.json()
        return _jwks_cache


async def get_current_user_id(request: Request) -> str | None:
    """Extract and validate user ID from Bearer token. Returns None if no token."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]

    try:
        jwks = await get_jwks()
        header = jwt.get_unverified_header(token)
        key = next(
            (k for k in jwks.get("keys", []) if k["kid"] == header.get("kid")),
            None,
        )
        if not key:
            # Key not found — invalidate cache and retry once (keys may have rotated)
            global _jwks_cache
            _jwks_cache = None
            jwks = await get_jwks()
            key = next(
                (k for k in jwks.get("keys", []) if k["kid"] == header.get("kid")),
                None,
            )
            if not key:
                logger.warning("JWT kid %s not found in JWKS", header.get("kid"))
                return None

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        # Convex JWT sub format: "userId|sessionId" — extract just the user ID
        sub = payload.get("sub")
        return sub.split("|")[0] if sub else None
    except (JWTError, Exception) as e:
        logger.warning("JWT validation failed: %s", e)
        return None


async def require_auth(request: Request) -> str:
    """Require authentication — raises 401 if not authenticated."""
    user_id = await get_current_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Reikalingas prisijungimas")
    return user_id
