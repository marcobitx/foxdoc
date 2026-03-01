# backend/app/services/providers/anthropic.py
# LLM provider strategy for Anthropic Claude models (via OpenRouter)
# Handles Claude-specific schema cleaning, cache_control, and thinking budgets
# Related: base.py, schema_utils.py, llm.py

from app.services.providers.base import BaseProvider
from app.services.schema_utils import flatten_nullable_anyof


def _clean_schema_for_anthropic(schema: dict) -> dict:
    """Clean schema for Anthropic Claude models.

    - Flattens nullable anyOf patterns to simple type (Anthropic handles Optional natively)
    - Removes title, description, default keys recursively
    - Adds additionalProperties: false on all object types
    - Preserves $defs/$ref to keep schema compact (Anthropic supports them)
    """
    def _clean(node: dict) -> dict:
        node = flatten_nullable_anyof(node)

        cleaned: dict = {}
        for key, value in node.items():
            if key in ("title", "description", "default"):
                continue
            if isinstance(value, dict):
                cleaned[key] = _clean(value)
            elif isinstance(value, list):
                cleaned[key] = [
                    _clean(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                cleaned[key] = value

        if cleaned.get("type") == "object" and "additionalProperties" not in cleaned:
            cleaned["additionalProperties"] = False

        return cleaned

    return _clean(schema)


_THINKING_BUDGETS: dict[str, int] = {
    "low": 2000,
    "medium": 5000,
    "high": 10000,
}


class AnthropicProvider(BaseProvider):
    """Provider strategy for Anthropic Claude models."""

    def prepare_schema(self, raw_schema: dict) -> dict:
        # Do NOT resolve_refs — Anthropic supports $defs/$ref natively.
        # Inlining refs causes "too many optional parameters" errors (79 > 24 limit).
        return _clean_schema_for_anthropic(dict(raw_schema))

    def build_response_format(self, cleaned_schema: dict, schema_name: str) -> dict:
        return {
            "type": "json_schema",
            "json_schema": {
                "name": schema_name,
                "schema": cleaned_schema,
            },
        }

    def build_messages(self, system: str, user: str | list[dict]) -> list[dict]:
        return [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": system,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
            },
            {"role": "user", "content": user},
        ]

    def build_thinking_config(self, thinking: str) -> dict | None:
        budget = _THINKING_BUDGETS.get(thinking)
        if budget is None:
            return None
        return {"type": "enabled", "budget_tokens": budget}

    def get_temperature(self, requested_temp: float, thinking: str) -> float | None:
        if thinking != "off":
            return 1.0
        return requested_temp

    def supports_native_pdf(self) -> bool:
        return True
