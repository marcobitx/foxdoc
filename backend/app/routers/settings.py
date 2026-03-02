# backend/app/routers/settings.py
# Settings endpoints: get and update API key, default model, token usage stats
# Persists settings in Convex DB
# Related: convex_client.py, config.py

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends

from app.config import AppSettings, get_settings
from app.convex_client import ConvexDB, get_db
from app.middleware.auth import get_current_user_id
from app.models.schemas import SettingsResponse, SettingsUpdate, TokenUsageStats

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["settings"])


@router.get("/settings", response_model=SettingsResponse)
async def get_settings_endpoint(
    settings: AppSettings = Depends(get_settings),
    db: ConvexDB = Depends(get_db),
):
    """Get current settings (API key is masked)."""
    # Check both env var and DB for API key
    has_key = bool(settings.openrouter_api_key)
    if not has_key:
        db_key = await db.get_setting("openrouter_api_key")
        has_key = bool(db_key)

    # Get default model from DB, fall back to env config
    db_model = await db.get_setting("default_model")
    default_model = db_model if db_model else settings.default_model

    return SettingsResponse(
        has_api_key=has_key,
        default_model=default_model,
    )


@router.put("/settings", response_model=SettingsResponse)
async def update_settings(
    body: SettingsUpdate,
    settings: AppSettings = Depends(get_settings),
    db: ConvexDB = Depends(get_db),
):
    """Update API key and/or default model."""
    if body.openrouter_api_key is not None:
        await db.set_setting("openrouter_api_key", body.openrouter_api_key)
        logger.info("Updated OpenRouter API key in DB")

    if body.default_model is not None:
        await db.set_setting("default_model", body.default_model)
        logger.info("Updated default model to %s", body.default_model)

    # Return updated state
    has_key = bool(settings.openrouter_api_key)
    if not has_key:
        db_key = await db.get_setting("openrouter_api_key")
        has_key = bool(db_key)

    db_model = await db.get_setting("default_model")
    default_model = db_model if db_model else settings.default_model

    return SettingsResponse(
        has_api_key=has_key,
        default_model=default_model,
    )


@router.get("/usage", response_model=TokenUsageStats)
async def get_usage_stats(
    db: ConvexDB = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    """Aggregate token usage for the authenticated user's analyses."""
    if not user_id:
        return TokenUsageStats(
            total_input_tokens=0, total_output_tokens=0, total_tokens=0,
            total_cost_usd=0.0, total_analyses=0,
            total_files_processed=0, total_pages_processed=0,
            by_phase={
                "extraction": {"input": 0, "output": 0},
                "aggregation": {"input": 0, "output": 0},
                "evaluation": {"input": 0, "output": 0},
            },
        )
    stats = await db.get_token_usage_stats()
    return TokenUsageStats(**stats)


@router.delete("/usage")
async def reset_usage_stats(
    db: ConvexDB = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    """Reset all token usage history by clearing metrics from analyses."""
    await db.reset_token_usage()
    logger.info("Token usage stats reset by user %s", user_id)
    return {"ok": True}
