# backend/app/routers/notes.py
# REST endpoints for notes CRUD and bulk operations
# Persists notes in Convex DB (or in-memory fallback)
# Related: convex_client.py, models/schemas.py

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.convex_client import ConvexDB, get_db
from app.middleware.auth import get_current_user_id, require_auth
from app.models.schemas import (
    NoteBulkAction,
    NoteBulkStatusUpdate,
    NoteCreate,
    NoteUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("")
async def list_notes(
    limit: int = 100,
    offset: int = 0,
    db: ConvexDB = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    """List notes for authenticated user (newest first). Returns empty if no auth."""
    if not user_id:
        return []
    return await db.list_notes_by_user(user_id=user_id, limit=limit, offset=offset)


@router.get("/{note_id}")
async def get_note(
    note_id: str,
    user_id: str = Depends(require_auth),
    db: ConvexDB = Depends(get_db),
):
    """Get a single note by ID (must belong to user)."""
    note = await db.get_note(note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.get("user_id") and note["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.post("", status_code=201)
async def create_note(
    body: NoteCreate,
    user_id: str = Depends(require_auth),
    db: ConvexDB = Depends(get_db),
):
    """Create a new note."""
    note_id = await db.create_note(
        title=body.title,
        content=body.content,
        status=body.status,
        priority=body.priority,
        tags=body.tags,
        color=body.color,
        pinned=body.pinned,
        analysis_id=body.analysis_id,
        user_id=user_id,
    )
    return {"id": note_id}


@router.patch("/{note_id}")
async def update_note(
    note_id: str,
    body: NoteUpdate,
    user_id: str = Depends(require_auth),
    db: ConvexDB = Depends(get_db),
):
    """Partial update on a note (must belong to user)."""
    existing = await db.get_note(note_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Note not found")
    if existing.get("user_id") and existing["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Note not found")

    # Use model_fields_set to distinguish "not sent" from "explicitly set to null"
    patch = {k: v for k, v in body.model_dump().items() if k in body.model_fields_set}
    if patch:
        await db.update_note(note_id, **patch)
    return {"ok": True}


@router.delete("/{note_id}")
async def delete_note(
    note_id: str,
    user_id: str = Depends(require_auth),
    db: ConvexDB = Depends(get_db),
):
    """Delete a single note (must belong to user)."""
    existing = await db.get_note(note_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Note not found")
    if existing.get("user_id") and existing["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Note not found")

    await db.delete_note(note_id)
    return {"ok": True}


@router.post("/bulk/delete")
async def bulk_delete_notes(
    body: NoteBulkAction,
    user_id: str = Depends(require_auth),
    db: ConvexDB = Depends(get_db),
):
    """Delete multiple notes at once."""
    await db.bulk_delete_notes(body.ids)
    return {"ok": True, "deleted": len(body.ids)}


@router.post("/bulk/status")
async def bulk_update_status(
    body: NoteBulkStatusUpdate,
    user_id: str = Depends(require_auth),
    db: ConvexDB = Depends(get_db),
):
    """Change status on multiple notes."""
    await db.bulk_update_notes_status(body.ids, body.status)
    return {"ok": True, "updated": len(body.ids)}
