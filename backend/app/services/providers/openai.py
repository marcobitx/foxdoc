# backend/app/services/providers/openai.py
# LLM provider strategy for OpenAI GPT models (via OpenRouter)
# Handles OpenAI strict-mode schema cleaning, type: [T, "null"] nullable format
# Related: base.py, schema_utils.py, llm.py

from app.services.providers.base import BaseProvider
from app.services.schema_utils import flatten_nullable_anyof_openai, resolve_refs


def _clean_schema_for_openai(schema: dict) -> dict:
    """Clean schema for OpenAI GPT models (strict mode).

    - Flattens nullable anyOf to type: [T, "null"] for primitives
    - Removes title, default keys recursively
    - KEEPS description
    - Adds additionalProperties: false on all object types
    - ALL properties must be in required array (OpenAI strict mode)
    """

    def _clean(node: dict) -> dict:
        node = flatten_nullable_anyof_openai(node)

        cleaned: dict = {}
        for key, value in node.items():
            if key in ("title", "default"):
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

        if cleaned.get("type") == "object":
            if "additionalProperties" not in cleaned:
                cleaned["additionalProperties"] = False
            if "properties" in cleaned:
                cleaned["required"] = list(cleaned["properties"].keys())

        return cleaned

    return _clean(schema)


_THINKING_BUDGETS: dict[str, int] = {
    "low": 2000,
    "medium": 5000,
    "high": 10000,
}


class OpenAIProvider(BaseProvider):
    """Provider strategy for OpenAI GPT models."""

    def prepare_schema(self, raw_schema: dict) -> dict:
        resolved = resolve_refs(dict(raw_schema))
        return _clean_schema_for_openai(resolved)

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
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

    def build_thinking_config(self, thinking: str) -> dict | None:
        budget = _THINKING_BUDGETS.get(thinking)
        if budget is None:
            return None
        return {"type": "enabled", "budget_tokens": budget}

    def get_temperature(self, requested_temp: float, thinking: str) -> float | None:
        return requested_temp

    def supports_native_pdf(self) -> bool:
        return False
