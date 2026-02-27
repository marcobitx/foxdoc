# Per-User Data Isolation Design

**Date:** 2026-02-27
**Status:** Approved

## Problem

All analyses and notes are globally visible — every user sees everyone's data. The `user_id` field exists on analyses but is never populated. Notes have no `user_id` field at all.

## Solution

Full per-user data isolation at the Convex query level. Every data query filters by authenticated user's ID. New users start with a clean slate.

## Architecture

### Layer 1: Convex Schema + Queries

- Add `user_id` field to `notes` table with `by_user` index
- All list queries use `by_user` index (analyses, notes)
- All mutations verify ownership before update/delete
- Migration script assigns existing records to marco lab's user ID

### Layer 2: FastAPI Auth Middleware

- New `get_current_user_id()` dependency extracts user from JWT
- All `/api/` endpoints require authentication
- Backend passes `user_id` to every Convex operation

### Layer 3: Frontend

- No changes needed — already sends auth tokens

## Files Changed

| File | Change |
|------|--------|
| `convex/schema.ts` | Add `user_id` to notes + index |
| `convex/notes.ts` | Filter all queries by user_id |
| `convex/analyses.ts` | Use `by_user` index in list query |
| `backend/app/convex_client.py` | Add user_id param to all operations |
| `backend/app/routers/analyze.py` | Auth dependency, pass user_id |
| New: migration script | Assign existing data to marco lab |

## Data Migration

All existing 34 analyses and 5 notes will be assigned to the marco lab account (marcobitx@gmail.com).
