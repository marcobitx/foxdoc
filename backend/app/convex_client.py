# backend/app/convex_client.py
# Database client wrapper with Convex backend and in-memory fallback.
# Provides a unified async interface for all DB operations (analyses,
# documents, chat messages, settings, streaming events).
# Related: config.py, convex/schema.ts, models/schemas.py

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)


class ConvexDB:
    """Database client. Uses Convex when configured, falls back to in-memory store.

    The in-memory store is organised by table name::

        {
            "analyses":      {id: {field: value, ...}, ...},
            "documents":     {id: {field: value, ...}, ...},
            "chat_messages": {id: {field: value, ...}, ...},
            "settings":      {id: {field: value, ...}, ...},
        }

    Every record gets ``_id`` and ``_creationTime`` (ISO-8601 UTC) on insert.
    All public methods are async so callers never need to care which backend
    is active.
    """

    # ------------------------------------------------------------------ #
    #  Construction
    # ------------------------------------------------------------------ #

    def __init__(self, url: str = "") -> None:
        self._client: Any = None  # ConvexClient when available
        self._memory_store: dict[str, dict[str, dict]] = {
            "analyses": {},
            "documents": {},
            "chat_messages": {},
            "settings": {},
            "user_activity_log": {},
            "user_settings": {},
            "saved_reports": {},
            "notes": {},
        }
        self._lock = asyncio.Lock()  # thread-safety for in-memory store

        if url:
            try:
                from convex import ConvexClient  # type: ignore[import-untyped]

                self._client = ConvexClient(url)
                logger.info("Connected to Convex DB at %s", url)
            except Exception as e:
                logger.warning("Convex unavailable, using in-memory store: %s", e)

    @property
    def is_convex(self) -> bool:
        """``True`` when backed by a live Convex deployment."""
        return self._client is not None

    # ------------------------------------------------------------------ #
    #  Internal helpers (in-memory)
    # ------------------------------------------------------------------ #

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _new_id(self) -> str:
        return str(uuid.uuid4())

    def _table(self, name: str) -> dict[str, dict]:
        if name not in self._memory_store:
            self._memory_store[name] = {}
        return self._memory_store[name]

    # ------------------------------------------------------------------ #
    #  Analyses
    # ------------------------------------------------------------------ #

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
            record: dict[str, Any] = {
                "_id": aid,
                "_creationTime": self._now_iso(),
                "status": "pending",
                "model": model,
                "report_json": None,
                "qa_json": None,
                "metrics_json": None,
                "events_json": [],
                "error": None,
            }
            if user_id:
                record["user_id"] = user_id
            self._table("analyses")[aid] = record
            return aid

    async def update_analysis(self, analysis_id: str, **kwargs: Any) -> None:
        """Update one or more fields on an analysis record."""
        if self.is_convex:
            try:
                self._client.mutation(
                    "analyses:update",
                    {"id": analysis_id, **kwargs},
                )
                return
            except Exception as e:
                logger.error("Convex update_analysis failed: %s", e)
                raise

        async with self._lock:
            record = self._table("analyses").get(analysis_id)
            if record is None:
                raise KeyError(f"Analysis {analysis_id} not found")
            record.update(kwargs)

    async def get_analysis(self, analysis_id: str) -> Optional[dict]:
        """Return an analysis dict or ``None`` if it doesn't exist."""
        if self.is_convex:
            try:
                return self._client.query(
                    "analyses:get",
                    {"id": analysis_id},
                )
            except Exception as e:
                logger.error("Convex get_analysis failed: %s", e)
                raise

        async with self._lock:
            record = self._table("analyses").get(analysis_id)
            return dict(record) if record is not None else None

    async def list_analyses(self, limit: int = 20, offset: int = 0) -> list[dict]:
        """List analyses sorted by creation time descending."""
        if self.is_convex:
            try:
                return self._client.query(
                    "analyses:list",
                    {"limit": limit, "offset": offset},
                )
            except Exception as e:
                logger.error("Convex list_analyses failed: %s", e)
                raise

        async with self._lock:
            all_records = sorted(
                self._table("analyses").values(),
                key=lambda r: r.get("_creationTime", ""),
                reverse=True,
            )
            page = all_records[offset : offset + limit]
            return [dict(r) for r in page]

    async def delete_analysis(self, analysis_id: str) -> None:
        """Delete analysis **and** cascade-delete its documents + chat messages."""
        if self.is_convex:
            try:
                self._client.mutation(
                    "analyses:remove",
                    {"id": analysis_id},
                )
                return
            except Exception as e:
                logger.error("Convex delete_analysis failed: %s", e)
                raise

        async with self._lock:
            # Remove the analysis itself
            self._table("analyses").pop(analysis_id, None)

            # Cascade: documents belonging to this analysis
            doc_table = self._table("documents")
            doc_ids_to_remove = [
                did
                for did, doc in doc_table.items()
                if doc.get("analysis_id") == analysis_id
            ]
            for did in doc_ids_to_remove:
                doc_table.pop(did, None)

            # Cascade: chat messages belonging to this analysis
            chat_table = self._table("chat_messages")
            chat_ids_to_remove = [
                cid
                for cid, msg in chat_table.items()
                if msg.get("analysis_id") == analysis_id
            ]
            for cid in chat_ids_to_remove:
                chat_table.pop(cid, None)

    # ------------------------------------------------------------------ #
    #  Documents
    # ------------------------------------------------------------------ #

    async def add_document(
        self,
        analysis_id: str,
        filename: str,
        doc_type: str,
        page_count: int = 0,
        content_text: str = "",
        extraction_json: Optional[dict] = None,
    ) -> str:
        """Add a document record linked to *analysis_id*. Returns document ID."""
        if self.is_convex:
            try:
                result = self._client.mutation(
                    "documents:create",
                    {
                        "analysis_id": analysis_id,
                        "filename": filename,
                        "doc_type": doc_type,
                        "page_count": page_count,
                        "content_text": content_text,
                        "extraction_json": extraction_json,
                    },
                )
                return str(result)
            except Exception as e:
                logger.error("Convex add_document failed: %s", e)
                raise

        async with self._lock:
            did = self._new_id()
            self._table("documents")[did] = {
                "_id": did,
                "_creationTime": self._now_iso(),
                "analysis_id": analysis_id,
                "filename": filename,
                "doc_type": doc_type,
                "page_count": page_count,
                "content_text": content_text,
                "extraction_json": extraction_json,
            }
            return did

    async def get_documents(self, analysis_id: str) -> list[dict]:
        """Return all documents for the given analysis, ordered by creation time."""
        if self.is_convex:
            try:
                return self._client.query(
                    "documents:listByAnalysis",
                    {"analysis_id": analysis_id},
                )
            except Exception as e:
                logger.error("Convex get_documents failed: %s", e)
                raise

        async with self._lock:
            docs = [
                dict(d)
                for d in self._table("documents").values()
                if d.get("analysis_id") == analysis_id
            ]
            docs.sort(key=lambda d: d.get("_creationTime", ""))
            return docs

    async def update_document(self, doc_id: str, **kwargs: Any) -> None:
        """Update one or more fields on a document record."""
        if self.is_convex:
            try:
                self._client.mutation(
                    "documents:update",
                    {"id": doc_id, **kwargs},
                )
                return
            except Exception as e:
                logger.error("Convex update_document failed: %s", e)
                raise

        async with self._lock:
            record = self._table("documents").get(doc_id)
            if record is None:
                raise KeyError(f"Document {doc_id} not found")
            record.update(kwargs)

    # ------------------------------------------------------------------ #
    #  Chat Messages
    # ------------------------------------------------------------------ #

    async def add_chat_message(
        self, analysis_id: str, role: str, content: str
    ) -> str:
        """Append a chat message. Returns message ID."""
        if self.is_convex:
            try:
                result = self._client.mutation(
                    "chat:create",
                    {
                        "analysis_id": analysis_id,
                        "role": role,
                        "content": content,
                    },
                )
                return str(result)
            except Exception as e:
                logger.error("Convex add_chat_message failed: %s", e)
                raise

        async with self._lock:
            mid = self._new_id()
            self._table("chat_messages")[mid] = {
                "_id": mid,
                "_creationTime": self._now_iso(),
                "analysis_id": analysis_id,
                "role": role,
                "content": content,
            }
            return mid

    async def get_chat_history(
        self, analysis_id: str, limit: int = 50
    ) -> list[dict]:
        """Return chat messages for an analysis, ordered chronologically."""
        if self.is_convex:
            try:
                return self._client.query(
                    "chat:listByAnalysis",
                    {"analysis_id": analysis_id, "limit": limit},
                )
            except Exception as e:
                logger.error("Convex get_chat_history failed: %s", e)
                raise

        async with self._lock:
            messages = [
                dict(m)
                for m in self._table("chat_messages").values()
                if m.get("analysis_id") == analysis_id
            ]
            messages.sort(key=lambda m: m.get("_creationTime", ""))
            return messages[-limit:]

    # ------------------------------------------------------------------ #
    #  Settings
    # ------------------------------------------------------------------ #

    async def get_setting(self, key: str) -> Optional[str]:
        """Retrieve a setting value by key, or ``None`` if not set."""
        if self.is_convex:
            try:
                result = self._client.query(
                    "settings:get",
                    {"key": key},
                )
                return result.get("value") if result else None
            except Exception as e:
                logger.error("Convex get_setting failed: %s", e)
                raise

        async with self._lock:
            for record in self._table("settings").values():
                if record.get("key") == key:
                    return record.get("value")
            return None

    async def set_setting(self, key: str, value: str) -> None:
        """Create or update a setting value."""
        if self.is_convex:
            try:
                self._client.mutation(
                    "settings:set",
                    {"key": key, "value": value},
                )
                return
            except Exception as e:
                logger.error("Convex set_setting failed: %s", e)
                raise

        async with self._lock:
            settings_table = self._table("settings")
            # Upsert: look for existing key
            for sid, record in settings_table.items():
                if record.get("key") == key:
                    record["value"] = value
                    return
            # Insert new
            sid = self._new_id()
            settings_table[sid] = {
                "_id": sid,
                "_creationTime": self._now_iso(),
                "key": key,
                "value": value,
            }

    # ------------------------------------------------------------------ #
    #  Events (for SSE streaming progress)
    # ------------------------------------------------------------------ #

    async def append_event(self, analysis_id: str, event: dict) -> None:
        """Append a pipeline event to the analysis ``events_json`` list."""
        if self.is_convex:
            try:
                self._client.mutation(
                    "analyses:appendEvent",
                    {"id": analysis_id, "event": event},
                )
                return
            except Exception as e:
                logger.error("Convex append_event failed: %s", e)
                raise

        async with self._lock:
            record = self._table("analyses").get(analysis_id)
            if record is None:
                raise KeyError(f"Analysis {analysis_id} not found")
            if record.get("events_json") is None:
                record["events_json"] = []
            record["events_json"].append(event)

    async def get_events(
        self, analysis_id: str, since_index: int = 0
    ) -> list[dict]:
        """Return events from *since_index* onward (for SSE polling)."""
        if self.is_convex:
            try:
                return self._client.query(
                    "analyses:getEvents",
                    {"id": analysis_id, "sinceIndex": since_index},
                )
            except Exception as e:
                logger.error("Convex get_events failed: %s", e)
                raise

        async with self._lock:
            record = self._table("analyses").get(analysis_id)
            if record is None:
                return []
            events: list[dict] = record.get("events_json") or []
            return list(events[since_index:])

    # ------------------------------------------------------------------ #
    #  Analyses — user-scoped queries
    # ------------------------------------------------------------------ #

    async def list_analyses_by_user(
        self, user_id: str, limit: int = 20, offset: int = 0
    ) -> list[dict]:
        """List analyses owned by a specific user."""
        if self.is_convex:
            try:
                return self._client.query(
                    "analyses:listByUser",
                    {"user_id": user_id, "limit": limit, "offset": offset},
                )
            except Exception as e:
                logger.error("Convex list_analyses_by_user failed: %s", e)
                raise

        async with self._lock:
            all_records = sorted(
                [
                    r
                    for r in self._table("analyses").values()
                    if r.get("user_id") == user_id
                ],
                key=lambda r: r.get("_creationTime", ""),
                reverse=True,
            )
            page = all_records[offset : offset + limit]
            return [dict(r) for r in page]

    # ------------------------------------------------------------------ #
    #  User Activity
    # ------------------------------------------------------------------ #

    async def log_activity(
        self, user_id: str, action: str, metadata: Optional[dict] = None
    ) -> str:
        """Record a user action (login, logout, analysis, export, etc.)."""
        if self.is_convex:
            try:
                result = self._client.mutation(
                    "userActivity:log",
                    {"user_id": user_id, "action": action, "metadata": metadata},
                )
                return str(result)
            except Exception as e:
                logger.error("Convex log_activity failed: %s", e)
                raise

        async with self._lock:
            aid = self._new_id()
            self._table("user_activity_log")[aid] = {
                "_id": aid,
                "_creationTime": self._now_iso(),
                "user_id": user_id,
                "action": action,
                "metadata": metadata,
            }
            return aid

    async def get_user_activity(
        self, user_id: str, limit: int = 50, offset: int = 0
    ) -> list[dict]:
        """Get activity log for a user (paginated, most recent first)."""
        if self.is_convex:
            try:
                return self._client.query(
                    "userActivity:listByUser",
                    {"user_id": user_id, "limit": limit, "offset": offset},
                )
            except Exception as e:
                logger.error("Convex get_user_activity failed: %s", e)
                raise

        async with self._lock:
            all_records = sorted(
                [
                    r
                    for r in self._table("user_activity_log").values()
                    if r.get("user_id") == user_id
                ],
                key=lambda r: r.get("_creationTime", ""),
                reverse=True,
            )
            page = all_records[offset : offset + limit]
            return [dict(r) for r in page]

    async def get_user_stats(self, user_id: str) -> dict:
        """Aggregate stats: total logins, analyses count, last active, etc."""
        if self.is_convex:
            try:
                return self._client.query(
                    "userActivity:getStats",
                    {"user_id": user_id},
                )
            except Exception as e:
                logger.error("Convex get_user_stats failed: %s", e)
                raise

        async with self._lock:
            records = [
                r
                for r in self._table("user_activity_log").values()
                if r.get("user_id") == user_id
            ]
            logins = sum(1 for r in records if r.get("action") == "login")
            analyses = sum(
                1 for r in records if r.get("action") == "analysis_started"
            )
            exports = sum(1 for r in records if r.get("action") == "export")
            sorted_records = sorted(
                records, key=lambda r: r.get("_creationTime", ""), reverse=True
            )
            last_active = (
                sorted_records[0].get("_creationTime") if sorted_records else None
            )
            return {
                "total_logins": logins,
                "total_analyses": analyses,
                "total_exports": exports,
                "last_active": last_active,
            }

    # ------------------------------------------------------------------ #
    #  User Settings
    # ------------------------------------------------------------------ #

    async def get_user_settings(self, user_id: str) -> dict:
        """Get settings for a user (returns defaults if none exist)."""
        if self.is_convex:
            try:
                return self._client.query(
                    "userSettings:get",
                    {"user_id": user_id},
                )
            except Exception as e:
                logger.error("Convex get_user_settings failed: %s", e)
                raise

        async with self._lock:
            for record in self._table("user_settings").values():
                if record.get("user_id") == user_id:
                    return dict(record)
            # Return defaults
            return {
                "user_id": user_id,
                "default_model": None,
                "theme": "system",
                "language": "lt",
                "notifications_enabled": True,
                "items_per_page": 10,
            }

    async def update_user_settings(self, user_id: str, **kwargs: Any) -> None:
        """Update one or more user settings fields."""
        if self.is_convex:
            try:
                self._client.mutation(
                    "userSettings:update",
                    {"user_id": user_id, **kwargs},
                )
                return
            except Exception as e:
                logger.error("Convex update_user_settings failed: %s", e)
                raise

        async with self._lock:
            settings_table = self._table("user_settings")
            for sid, record in settings_table.items():
                if record.get("user_id") == user_id:
                    record.update(kwargs)
                    return
            # Insert new
            sid = self._new_id()
            settings_table[sid] = {
                "_id": sid,
                "_creationTime": self._now_iso(),
                "user_id": user_id,
                **kwargs,
            }

    # ------------------------------------------------------------------ #
    #  Saved Reports
    # ------------------------------------------------------------------ #

    async def save_report(
        self,
        user_id: str,
        analysis_id: str,
        title: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> str:
        """Bookmark an analysis. Returns bookmark ID."""
        if self.is_convex:
            try:
                result = self._client.mutation(
                    "savedReports:save",
                    {
                        "user_id": user_id,
                        "analysis_id": analysis_id,
                        "title": title,
                        "notes": notes,
                    },
                )
                return str(result)
            except Exception as e:
                logger.error("Convex save_report failed: %s", e)
                raise

        async with self._lock:
            # Check if already saved
            for record in self._table("saved_reports").values():
                if (
                    record.get("user_id") == user_id
                    and record.get("analysis_id") == analysis_id
                ):
                    return record["_id"]

            bid = self._new_id()
            self._table("saved_reports")[bid] = {
                "_id": bid,
                "_creationTime": self._now_iso(),
                "user_id": user_id,
                "analysis_id": analysis_id,
                "title": title,
                "notes": notes,
                "pinned": False,
            }
            return bid

    async def unsave_report(self, user_id: str, analysis_id: str) -> None:
        """Remove a bookmark."""
        if self.is_convex:
            try:
                self._client.mutation(
                    "savedReports:unsave",
                    {"user_id": user_id, "analysis_id": analysis_id},
                )
                return
            except Exception as e:
                logger.error("Convex unsave_report failed: %s", e)
                raise

        async with self._lock:
            table = self._table("saved_reports")
            to_remove = [
                sid
                for sid, r in table.items()
                if r.get("user_id") == user_id
                and r.get("analysis_id") == analysis_id
            ]
            for sid in to_remove:
                table.pop(sid, None)

    async def get_saved_reports(self, user_id: str) -> list[dict]:
        """Get all saved reports for a user."""
        if self.is_convex:
            try:
                return self._client.query(
                    "savedReports:listByUser",
                    {"user_id": user_id},
                )
            except Exception as e:
                logger.error("Convex get_saved_reports failed: %s", e)
                raise

        async with self._lock:
            reports = [
                dict(r)
                for r in self._table("saved_reports").values()
                if r.get("user_id") == user_id
            ]
            reports.sort(key=lambda r: r.get("_creationTime", ""), reverse=True)
            return reports

    async def is_report_saved(self, user_id: str, analysis_id: str) -> bool:
        """Check if a specific analysis is bookmarked by the user."""
        if self.is_convex:
            try:
                return self._client.query(
                    "savedReports:isSaved",
                    {"user_id": user_id, "analysis_id": analysis_id},
                )
            except Exception as e:
                logger.error("Convex is_report_saved failed: %s", e)
                raise

        async with self._lock:
            return any(
                r.get("user_id") == user_id and r.get("analysis_id") == analysis_id
                for r in self._table("saved_reports").values()
            )

    async def get_token_usage_stats(self) -> dict:
        """Aggregate token usage from all completed analyses."""
        analyses = await self.list_analyses(limit=1000, offset=0)
        stats = {
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "total_tokens": 0,
            "total_cost_usd": 0.0,
            "total_analyses": 0,
            "total_files_processed": 0,
            "total_pages_processed": 0,
            "by_phase": {
                "extraction": {"input": 0, "output": 0},
                "aggregation": {"input": 0, "output": 0},
                "evaluation": {"input": 0, "output": 0},
            },
        }
        for a in analyses:
            metrics = a.get("metrics_json")
            if not metrics:
                continue
            stats["total_analyses"] += 1
            stats["total_files_processed"] += metrics.get("total_files", 0)
            stats["total_pages_processed"] += metrics.get("total_pages", 0)
            stats["total_cost_usd"] += metrics.get("estimated_cost_usd", 0.0)

            ext_in = metrics.get("tokens_extraction_input", 0)
            ext_out = metrics.get("tokens_extraction_output", 0)
            agg_in = metrics.get("tokens_aggregation_input", 0)
            agg_out = metrics.get("tokens_aggregation_output", 0)
            evl_in = metrics.get("tokens_evaluation_input", 0)
            evl_out = metrics.get("tokens_evaluation_output", 0)

            total_in = ext_in + agg_in + evl_in
            total_out = ext_out + agg_out + evl_out

            stats["total_input_tokens"] += total_in
            stats["total_output_tokens"] += total_out
            stats["total_tokens"] += total_in + total_out

            stats["by_phase"]["extraction"]["input"] += ext_in
            stats["by_phase"]["extraction"]["output"] += ext_out
            stats["by_phase"]["aggregation"]["input"] += agg_in
            stats["by_phase"]["aggregation"]["output"] += agg_out
            stats["by_phase"]["evaluation"]["input"] += evl_in
            stats["by_phase"]["evaluation"]["output"] += evl_out

        return stats

    async def update_saved_report(self, bookmark_id: str, **kwargs: Any) -> None:
        """Edit title/notes/pinned on a saved report."""
        if self.is_convex:
            try:
                self._client.mutation(
                    "savedReports:updateNotes",
                    {"id": bookmark_id, **kwargs},
                )
                return
            except Exception as e:
                logger.error("Convex update_saved_report failed: %s", e)
                raise

        async with self._lock:
            record = self._table("saved_reports").get(bookmark_id)
            if record is None:
                raise KeyError(f"Saved report {bookmark_id} not found")
            record.update(kwargs)

    # ------------------------------------------------------------------ #
    #  Notes
    # ------------------------------------------------------------------ #

    async def create_note(
        self,
        title: str = "",
        content: str = "",
        status: str = "idea",
        priority: str = "medium",
        tags: Optional[list[str]] = None,
        color: Optional[str] = "default",
        pinned: bool = False,
        analysis_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> str:
        """Create a new note. Returns note ID."""
        if self.is_convex:
            try:
                args: dict[str, Any] = {
                    "title": title,
                    "content": content,
                    "status": status,
                    "priority": priority,
                    "tags": tags or [],
                    "pinned": pinned,
                }
                if color is not None:
                    args["color"] = color
                if analysis_id is not None:
                    args["analysis_id"] = analysis_id
                if user_id is not None:
                    args["user_id"] = user_id
                result = self._client.mutation("notes:create", args)
                return str(result)
            except Exception as e:
                logger.error("Convex create_note failed: %s", e)
                raise

        async with self._lock:
            nid = self._new_id()
            now = self._now_iso()
            record: dict[str, Any] = {
                "_id": nid,
                "_creationTime": now,
                "title": title,
                "content": content,
                "status": status,
                "priority": priority,
                "tags": tags or [],
                "color": color,
                "pinned": pinned,
                "analysis_id": analysis_id,
                "updated_at": int(datetime.now(timezone.utc).timestamp() * 1000),
            }
            if user_id:
                record["user_id"] = user_id
            self._table("notes")[nid] = record
            return nid

    async def update_note(self, note_id: str, **kwargs: Any) -> None:
        """Partial update on a note."""
        if self.is_convex:
            try:
                self._client.mutation(
                    "notes:update",
                    {"id": note_id, **kwargs},
                )
                return
            except Exception as e:
                logger.error("Convex update_note failed: %s", e)
                raise

        async with self._lock:
            record = self._table("notes").get(note_id)
            if record is None:
                raise KeyError(f"Note {note_id} not found")
            record.update(kwargs)
            record["updated_at"] = int(
                datetime.now(timezone.utc).timestamp() * 1000
            )

    async def delete_note(self, note_id: str) -> None:
        """Delete a single note."""
        if self.is_convex:
            try:
                self._client.mutation("notes:remove", {"id": note_id})
                return
            except Exception as e:
                logger.error("Convex delete_note failed: %s", e)
                raise

        async with self._lock:
            self._table("notes").pop(note_id, None)

    async def bulk_delete_notes(self, note_ids: list[str]) -> None:
        """Delete multiple notes at once."""
        if self.is_convex:
            try:
                self._client.mutation("notes:bulkRemove", {"ids": note_ids})
                return
            except Exception as e:
                logger.error("Convex bulk_delete_notes failed: %s", e)
                raise

        async with self._lock:
            table = self._table("notes")
            for nid in note_ids:
                table.pop(nid, None)

    async def bulk_update_notes_status(
        self, note_ids: list[str], status: str
    ) -> None:
        """Change status on multiple notes."""
        if self.is_convex:
            try:
                self._client.mutation(
                    "notes:bulkUpdateStatus",
                    {"ids": note_ids, "status": status},
                )
                return
            except Exception as e:
                logger.error("Convex bulk_update_notes_status failed: %s", e)
                raise

        async with self._lock:
            table = self._table("notes")
            now = int(datetime.now(timezone.utc).timestamp() * 1000)
            for nid in note_ids:
                record = table.get(nid)
                if record:
                    record["status"] = status
                    record["updated_at"] = now

    async def get_note(self, note_id: str) -> Optional[dict]:
        """Return a note dict or None."""
        if self.is_convex:
            try:
                return self._client.query("notes:get", {"id": note_id})
            except Exception as e:
                logger.error("Convex get_note failed: %s", e)
                raise

        async with self._lock:
            record = self._table("notes").get(note_id)
            return dict(record) if record is not None else None

    async def list_notes(
        self, limit: int = 100, offset: int = 0
    ) -> list[dict]:
        """List notes sorted by creation time descending."""
        if self.is_convex:
            try:
                return self._client.query(
                    "notes:list",
                    {"limit": limit, "offset": offset},
                )
            except Exception as e:
                logger.error("Convex list_notes failed: %s", e)
                raise

        async with self._lock:
            all_records = sorted(
                self._table("notes").values(),
                key=lambda r: r.get("_creationTime", ""),
                reverse=True,
            )
            page = all_records[offset : offset + limit]
            return [dict(r) for r in page]

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


# ------------------------------------------------------------------ #
#  FastAPI Dependency
# ------------------------------------------------------------------ #

_db_instance: Optional[ConvexDB] = None


def get_db() -> ConvexDB:
    """FastAPI dependency — returns the singleton :class:`ConvexDB`.

    On first call, reads ``convex_url`` from :class:`app.config.AppSettings`.
    If the URL is empty the client falls back to in-memory storage automatically.
    """
    global _db_instance
    if _db_instance is None:
        from app.config import AppSettings

        settings = AppSettings()
        _db_instance = ConvexDB(url=settings.convex_url)
    return _db_instance
