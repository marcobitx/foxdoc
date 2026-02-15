# backend/app/routers/user.py
# User-scoped API endpoints: profile, activity, settings, saved reports
# Provides per-user data access for auth'd users
# Related: convex_client.py, models/schemas.py

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.convex_client import ConvexDB, get_db
from app.models.schemas import (
    SavedReportCreate,
    SavedReportUpdate,
    UserSettingsUpdate,
)

router = APIRouter(prefix="/api/user", tags=["user"])


# ── Profile ──────────────────────────────────────────────────────────────────


@router.get("/me")
async def get_current_user(user_id: str = Query(...), db: ConvexDB = Depends(get_db)):
    """Get current user profile. user_id passed as query param until auth middleware is wired."""
    stats = await db.get_user_stats(user_id)
    settings = await db.get_user_settings(user_id)
    return {
        "user_id": user_id,
        "stats": stats,
        "settings": settings,
    }


# ── Activity ─────────────────────────────────────────────────────────────────


@router.get("/activity")
async def get_user_activity(
    user_id: str = Query(...),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: ConvexDB = Depends(get_db),
):
    """Get user's activity log (paginated, most recent first)."""
    return await db.get_user_activity(user_id, limit=limit, offset=offset)


@router.get("/stats")
async def get_user_stats(
    user_id: str = Query(...), db: ConvexDB = Depends(get_db)
):
    """Get user analytics stats (logins, analyses, exports, last active)."""
    return await db.get_user_stats(user_id)


# ── Settings ─────────────────────────────────────────────────────────────────


@router.get("/settings")
async def get_user_settings(
    user_id: str = Query(...), db: ConvexDB = Depends(get_db)
):
    """Get user preferences."""
    return await db.get_user_settings(user_id)


@router.put("/settings")
async def update_user_settings(
    body: UserSettingsUpdate,
    user_id: str = Query(...),
    db: ConvexDB = Depends(get_db),
):
    """Update user preferences."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.update_user_settings(user_id, **updates)
    return await db.get_user_settings(user_id)


# ── Saved Reports ────────────────────────────────────────────────────────────


@router.get("/saved")
async def list_saved_reports(
    user_id: str = Query(...), db: ConvexDB = Depends(get_db)
):
    """List saved/bookmarked reports for a user."""
    return await db.get_saved_reports(user_id)


@router.post("/saved", status_code=201)
async def save_report(
    body: SavedReportCreate,
    user_id: str = Query(...),
    db: ConvexDB = Depends(get_db),
):
    """Bookmark an analysis."""
    bookmark_id = await db.save_report(
        user_id=user_id,
        analysis_id=body.analysis_id,
        title=body.title,
        notes=body.notes,
    )
    return {"id": bookmark_id}


@router.delete("/saved/{analysis_id}")
async def unsave_report(
    analysis_id: str,
    user_id: str = Query(...),
    db: ConvexDB = Depends(get_db),
):
    """Remove bookmark for an analysis."""
    await db.unsave_report(user_id=user_id, analysis_id=analysis_id)
    return {"ok": True}


@router.patch("/saved/{bookmark_id}")
async def update_saved_report(
    bookmark_id: str,
    body: SavedReportUpdate,
    user_id: str = Query(...),
    db: ConvexDB = Depends(get_db),
):
    """Update bookmark notes/title/pinned status."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.update_saved_report(bookmark_id, **updates)
    return {"ok": True}
