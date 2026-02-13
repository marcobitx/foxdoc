# backend/app/routers/models.py
# LLM model listing endpoint — fetches available models from OpenRouter
# Allows frontend to populate model selector dropdown
# Related: services/llm.py, models/schemas.py

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.config import AppSettings, get_settings
from app.convex_client import ConvexDB, get_db
from app.models.schemas import ModelInfo, ModelsResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["models"])


@router.get("/models", response_model=ModelsResponse)
async def list_models(
    settings: AppSettings = Depends(get_settings),
    db: ConvexDB = Depends(get_db),
):
    """Fetch available models from OpenRouter that support structured output."""
    # Get API key from settings or DB
    api_key = settings.openrouter_api_key
    if not api_key:
        db_key = await db.get_setting("openrouter_api_key")
        if db_key:
            api_key = db_key

    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="OpenRouter API key not configured. Set it in Settings.",
        )

    from app.services.llm import LLMClient

    llm = LLMClient(api_key=api_key, default_model=settings.default_model)
    try:
        raw_models = await llm.list_models()
    except Exception as e:
        logger.error("Failed to fetch models: %s", e, exc_info=True)
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch models from OpenRouter: {e}",
        )
    finally:
        await llm.close()

    models = [
        ModelInfo(
            id=m["id"],
            name=m["name"],
            context_length=m["context_length"],
            pricing_prompt=m["pricing_prompt"],
            pricing_completion=m["pricing_completion"],
        )
        for m in raw_models
    ]

    return ModelsResponse(models=models)
