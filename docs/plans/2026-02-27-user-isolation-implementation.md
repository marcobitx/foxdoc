# Per-User Data Isolation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Every user sees only their own analyses and notes. New users start with a clean slate.

**Architecture:** Add `user_id` to all Convex queries/mutations, extract user identity from JWT in FastAPI middleware, and migrate existing data to marco lab's account.

**Tech Stack:** Convex (schema + queries), FastAPI (auth dependency), Python convex client

---

### Task 1: Add user_id to notes schema and Convex queries

**Files:**
- Modify: `convex/schema.ts:82-94`
- Modify: `convex/notes.ts` (full file)

**Step 1: Update notes schema — add user_id field and by_user index**

In `convex/schema.ts`, change the `notes` table definition:

```typescript
  notes: defineTable({
    user_id: v.optional(v.id("users")),  // NEW — optional for backward compat
    title: v.string(),
    content: v.string(),
    status: v.string(),
    priority: v.string(),
    tags: v.array(v.string()),
    color: v.optional(v.string()),
    pinned: v.boolean(),
    analysis_id: v.optional(v.id("analyses")),
    updated_at: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_user", ["user_id"]),   // NEW
```

**Step 2: Update notes:create to accept user_id**

In `convex/notes.ts`, add `user_id` to the `create` mutation args:

```typescript
export const create = mutation({
  args: {
    user_id: v.optional(v.id("users")),  // NEW
    title: v.string(),
    content: v.string(),
    status: v.string(),
    priority: v.string(),
    tags: v.array(v.string()),
    color: v.optional(v.string()),
    pinned: v.boolean(),
    analysis_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const insertArgs: any = {
      user_id: args.user_id,  // NEW
      title: args.title,
      content: args.content,
      status: args.status,
      priority: args.priority,
      tags: args.tags,
      color: args.color,
      pinned: args.pinned,
      updated_at: now,
    };

    if (args.analysis_id) {
      const analysisDocId = ctx.db.normalizeId("analyses", args.analysis_id);
      if (analysisDocId) {
        insertArgs.analysis_id = analysisDocId;
      }
    }

    const id = await ctx.db.insert("notes", insertArgs);
    return id.toString();
  },
});
```

**Step 3: Add listByUser query to notes.ts**

Append after the existing `list` query:

```typescript
export const listByUser = query({
  args: {
    user_id: v.id("users"),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .order("desc")
      .collect();

    const page = all.slice(args.offset, args.offset + args.limit);
    return page.map((doc) => ({
      ...doc,
      _id: doc._id.toString(),
      analysis_id: doc.analysis_id?.toString() ?? null,
    }));
  },
});
```

**Step 4: Add allTagsByUser query to notes.ts**

Replace or add alongside existing `allTags`:

```typescript
export const allTagsByUser = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();
    const tagCounts: Record<string, number> = {};
    for (const note of all) {
      for (const tag of note.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    return tagCounts;
  },
});
```

**Step 5: Deploy Convex schema**

Run: `npx convex dev --once`
Expected: Schema updated, new index created

**Step 6: Commit**

```bash
git add convex/schema.ts convex/notes.ts
git commit -m "feat: add user_id to notes schema and user-scoped queries"
```

---

### Task 2: Create Convex user lookup mutation for backend

**Files:**
- Create: `convex/userLookup.ts`

**Step 1: Create userLookup.ts**

The backend receives a Convex JWT but needs the user's Convex `_id`. Create a Convex query that resolves a user by their token subject (sub claim). The backend will decode the JWT to get the subject, then call this query.

Actually, simpler approach: the backend can call `users:currentUser` but that requires auth context. Instead, create a query that finds a user by email (which the backend can extract from JWT).

Simplest approach: create a mutation/query that accepts the JWT's `sub` field (which is the Convex user ID directly for @convex-dev/auth):

```typescript
// convex/userLookup.ts
// Resolves a user by their Convex user ID string
// Called by backend to validate JWT subject claim
// Related: users.ts, auth.ts

import { query } from "./_generated/server";
import { v } from "convex/values";

export const byId = query({
  args: { user_id: v.string() },
  handler: async (ctx, args) => {
    const docId = ctx.db.normalizeId("users", args.user_id);
    if (!docId) return null;
    const user = await ctx.db.get(docId);
    if (!user) return null;
    return { _id: user._id.toString(), name: user.name, email: user.email };
  },
});
```

**Step 2: Deploy and commit**

```bash
npx convex dev --once
git add convex/userLookup.ts
git commit -m "feat: add user lookup query for backend auth"
```

---

### Task 3: Add auth dependency to FastAPI backend

**Files:**
- Modify: `backend/app/convex_client.py:86-112` (create_analysis)
- Modify: `backend/app/convex_client.py:951-972` (list_notes)
- Modify: `backend/app/convex_client.py:814-862` (create_note)
- Modify: `backend/app/routers/analyze.py:160-217` (create_analysis endpoint)
- Modify: `backend/app/routers/analyze.py:464-471` (list_analyses endpoint)
- Modify: `backend/app/routers/notes.py` (all endpoints)

**Step 1: Create auth dependency in a new file**

Create `backend/app/auth.py`:

```python
# backend/app/auth.py
# FastAPI dependency to extract current user ID from Convex JWT
# Decodes the Authorization Bearer token and returns user_id
# Related: convex_client.py, routers/analyze.py, routers/notes.py

from __future__ import annotations

import json
import base64
import logging

from fastapi import Depends, HTTPException, Request

logger = logging.getLogger(__name__)


def _decode_jwt_payload(token: str) -> dict:
    """Decode JWT payload without verification.

    Convex JWTs are already validated by Convex when used in queries.
    We only need the subject claim to identify the user.
    """
    try:
        payload_b64 = token.split(".")[1]
        # Add padding
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

    Returns the 'sub' claim from the JWT, which is the Convex user _id.
    Raises 401 if no valid token is present.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")

    token = auth_header[7:]  # Strip "Bearer "
    payload = _decode_jwt_payload(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid auth token: no subject")

    return user_id


async def get_optional_user_id(request: Request) -> str | None:
    """Like get_current_user_id but returns None instead of raising 401."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    try:
        token = auth_header[7:]
        payload = _decode_jwt_payload(token)
        return payload.get("sub")
    except HTTPException:
        return None
```

**Step 2: Update convex_client.py — create_analysis accepts user_id**

In `backend/app/convex_client.py`, change `create_analysis` (line 86):

```python
    async def create_analysis(self, model: str, user_id: str | None = None) -> str:
        """Create a new analysis record and return its ID."""
        if self.is_convex:
            try:
                args: dict[str, Any] = {"model": model, "status": "pending"}
                if user_id:
                    args["user_id"] = user_id
                result = self._client.mutation(
                    "analyses:create",
                    args,
                )
                return str(result)
            except Exception as e:
                logger.error("Convex create_analysis failed: %s", e)
                raise

        async with self._lock:
            aid = self._new_id()
            self._table("analyses")[aid] = {
                "_id": aid,
                "_creationTime": self._now_iso(),
                "status": "pending",
                "model": model,
                "user_id": user_id,
                "report_json": None,
                "qa_json": None,
                "metrics_json": None,
                "events_json": [],
                "error": None,
            }
            return aid
```

**Step 3: Update convex_client.py — create_note accepts user_id**

In `backend/app/convex_client.py`, change `create_note` (line 814):

Add `user_id: str | None = None` parameter. In the Convex branch, add `if user_id: args["user_id"] = user_id`. In the in-memory branch, add `"user_id": user_id` to the dict.

**Step 4: Update convex_client.py — add list_notes_by_user**

After `list_notes` method (line 951), add:

```python
    async def list_notes_by_user(
        self, user_id: str, limit: int = 100, offset: int = 0
    ) -> list[dict]:
        """List notes owned by a specific user."""
        if self.is_convex:
            try:
                return self._client.query(
                    "notes:listByUser",
                    {"user_id": user_id, "limit": limit, "offset": offset},
                )
            except Exception as e:
                logger.error("Convex list_notes_by_user failed: %s", e)
                raise

        async with self._lock:
            all_records = sorted(
                [
                    r
                    for r in self._table("notes").values()
                    if r.get("user_id") == user_id
                ],
                key=lambda r: r.get("_creationTime", ""),
                reverse=True,
            )
            page = all_records[offset : offset + limit]
            return [dict(r) for r in page]
```

**Step 5: Update analyze.py — add auth to create_analysis endpoint**

In `backend/app/routers/analyze.py`:

Add import at top:
```python
from app.auth import get_current_user_id, get_optional_user_id
```

Change `create_analysis` endpoint (line 160):
```python
@router.post("/analyze", response_model=AnalysisDetail, status_code=202)
async def create_analysis(
    files: list[UploadFile],
    model: str = Form("anthropic/claude-sonnet-4"),
    db: ConvexDB = Depends(get_db),
    settings: AppSettings = Depends(get_settings),
    user_id: str | None = Depends(get_optional_user_id),  # NEW
):
```

Change line 216:
```python
    analysis_id = await db.create_analysis(model=model, user_id=user_id)
```

**Step 6: Update analyze.py — add auth to list_analyses endpoint**

Change `list_analyses` endpoint (line 464):
```python
@router.get("/analyses", response_model=list[AnalysisSummary])
async def list_analyses(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    db: ConvexDB = Depends(get_db),
    user_id: str | None = Depends(get_optional_user_id),  # NEW
):
    """List past analyses, most recent first."""
    if user_id:
        records = await db.list_analyses_by_user(user_id=user_id, limit=limit, offset=offset)
    else:
        records = await db.list_analyses(limit=limit, offset=offset)
```

**Step 7: Update notes.py — add auth to all endpoints**

In `backend/app/routers/notes.py`:

Add import:
```python
from app.auth import get_current_user_id, get_optional_user_id
```

Update `list_notes`:
```python
@router.get("")
async def list_notes(
    limit: int = 100,
    offset: int = 0,
    db: ConvexDB = Depends(get_db),
    user_id: str | None = Depends(get_optional_user_id),  # NEW
):
    """List notes for current user (newest first)."""
    if user_id:
        return await db.list_notes_by_user(user_id=user_id, limit=limit, offset=offset)
    return await db.list_notes(limit=limit, offset=offset)
```

Update `create_note`:
```python
@router.post("", status_code=201)
async def create_note(
    body: NoteCreate,
    db: ConvexDB = Depends(get_db),
    user_id: str | None = Depends(get_optional_user_id),  # NEW
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
        user_id=user_id,  # NEW
    )
    return {"id": note_id}
```

**Step 8: Commit**

```bash
git add backend/app/auth.py backend/app/convex_client.py backend/app/routers/analyze.py backend/app/routers/notes.py
git commit -m "feat: add per-user data isolation to analyses and notes"
```

---

### Task 4: Migrate existing data to marco lab's account

**Files:**
- Create: `convex/migrations.ts`

**Step 1: Create migration script**

```typescript
// convex/migrations.ts
// One-time data migration — assigns orphaned analyses and notes to marco lab
// Run via Convex dashboard or CLI action
// Related: schema.ts, analyses.ts, notes.ts

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const assignOrphanedData = mutation({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    let analysesUpdated = 0;
    let notesUpdated = 0;

    // Assign orphaned analyses
    const analyses = await ctx.db.query("analyses").collect();
    for (const a of analyses) {
      if (!a.user_id) {
        await ctx.db.patch(a._id, { user_id: args.user_id });
        analysesUpdated++;
      }
    }

    // Assign orphaned notes
    const notes = await ctx.db.query("notes").collect();
    for (const n of notes) {
      if (!n.user_id) {
        await ctx.db.patch(n._id, { user_id: args.user_id });
        notesUpdated++;
      }
    }

    return { analysesUpdated, notesUpdated };
  },
});
```

**Step 2: Deploy and run migration**

```bash
npx convex dev --once
```

Then find marco lab's user ID from Convex dashboard and run:
```bash
npx convex run migrations:assignOrphanedData '{"user_id": "<MARCO_USER_ID>"}'
```

To find the user ID, run:
```bash
npx convex run userLookup:byId '{"user_id": "FIND_IN_DASHBOARD"}'
```

Or check via Convex dashboard → Data → users table → find marcobitx@gmail.com → copy _id.

**Step 3: Commit**

```bash
git add convex/migrations.ts
git commit -m "feat: add data migration to assign orphaned records to marco lab"
```

---

### Task 5: Deploy and verify

**Step 1: Deploy Convex**

```bash
npx convex deploy
```

**Step 2: Deploy frontend**

```bash
gh workflow run deploy-frontend.yml --ref main
```

**Step 3: Deploy landing**

```bash
cd landing && npx vercel --prod
```

**Step 4: Verify with browser testing**

1. Navigate to `https://foxdoc.io/auth` — sign in as marco lab
2. Check Istorija — should show all 34 analyses
3. Check Užrašai — should show all 5 notes
4. Sign out and create new test account
5. Sign in as new user — Istorija should be empty, Užrašai should be empty
6. Create a test note — verify it shows only for new user
7. Sign back in as marco lab — verify test note is NOT visible

---

## Summary

| Task | Description | Est. Lines Changed |
|------|-------------|-------------------|
| 1 | Notes schema + Convex queries | ~60 lines |
| 2 | User lookup query | ~15 lines |
| 3 | FastAPI auth + all endpoints | ~100 lines |
| 4 | Data migration | ~30 lines |
| 5 | Deploy + verify | 0 (ops only) |
