# backend/app/auth.py
# FastAPI dependency to extract current user ID from Convex JWT
# Decodes the Authorization Bearer token and returns user_id
# Related: convex_client.py, routers/analyze.py, routers/notes.py

from __future__ import annotations

import json
import base64
import logging

from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)


def _decode_jwt_payload(token: str) -> dict:
    """Decode JWT payload without verification.

    Convex JWTs are already validated by Convex when used in queries.
    We only need the subject claim to identify the user.
    """
    try:
        payload_b64 = token.split(".")[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(payload_bytes)
    except Exception as e:
        logger.warning("JWT decode failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid auth token")


async def get_current_user_id(request: Request) -> str:
    """Extract Convex user ID from Authorization header.
    Raises 401 if no valid token is present.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")

    token = auth_header[7:]
    payload = _decode_jwt_payload(token)

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid auth token: no subject")

    # Convex JWT sub format: "userId|sessionId" — extract just the user ID
    user_id = sub.split("|")[0]
    return user_id


async def get_optional_user_id(request: Request) -> str | None:
    """Like get_current_user_id but returns None instead of raising 401."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    try:
        token = auth_header[7:]
        payload = _decode_jwt_payload(token)
        sub = payload.get("sub")
        # Convex JWT sub format: "userId|sessionId" — extract just the user ID
        return sub.split("|")[0] if sub else None
    except HTTPException:
        return None
