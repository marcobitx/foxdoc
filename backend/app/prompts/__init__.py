# backend/app/prompts/__init__.py
# LLM prompt templates package — all prompts are in Lithuanian.

from .aggregation import AGGREGATION_SYSTEM, AGGREGATION_USER
from .chat import CHAT_SYSTEM
from .evaluation import EVALUATION_SYSTEM, EVALUATION_USER
from .extraction import EXTRACTION_SYSTEM, EXTRACTION_USER

__all__ = [
    "EXTRACTION_SYSTEM",
    "EXTRACTION_USER",
    "AGGREGATION_SYSTEM",
    "AGGREGATION_USER",
    "EVALUATION_SYSTEM",
    "EVALUATION_USER",
    "CHAT_SYSTEM",
]
