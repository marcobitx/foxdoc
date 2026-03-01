# backend/app/services/providers/google.py
# LLM provider strategy for Google Gemini models (via OpenRouter)
# Handles Gemini-specific schema requirements: descriptions on all fields, no $ref, no anyOf
# Related: base.py, schema_utils.py, llm.py

from app.services.providers.base import BaseProvider
from app.services.schema_utils import flatten_nullable_anyof, resolve_refs


def _clean_schema_for_google(schema: dict) -> dict:
    """Clean schema for Google Gemini models.

    - Removes title, default (KEEPS description)
    - Adds fallback description where missing
    - Flattens anyOf nullable patterns
    - Ensures required array on all objects
    - Adds additionalProperties: false on all objects
    - Ensures array items have descriptions and nested required
    """

    def _clean(node: dict, field_name: str = "") -> dict:
        # Flatten nullable anyOf before processing
        node = flatten_nullable_anyof(node)

        cleaned: dict = {}
        for key, value in node.items():
            if key in ("title", "default"):
                continue
            if key == "properties" and isinstance(value, dict):
                cleaned_props: dict = {}
                for prop_name, prop_val in value.items():
                    if isinstance(prop_val, dict):
                        cleaned_prop = _clean(prop_val, field_name=prop_name)
                        if "description" not in cleaned_prop:
                            cleaned_prop["description"] = prop_name.replace("_", " ")
                        cleaned_props[prop_name] = cleaned_prop
                    else:
                        cleaned_props[prop_name] = prop_val
                cleaned[key] = cleaned_props
            elif isinstance(value, dict):
                cleaned[key] = _clean(value, field_name=field_name)
            elif isinstance(value, list):
                cleaned[key] = [
                    _clean(item, field_name=field_name) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                cleaned[key] = value

        if cleaned.get("type") == "object":
            if "additionalProperties" not in cleaned:
                cleaned["additionalProperties"] = False
            # Gemini needs required array -- if properties exist but required is missing, add all
            if "properties" in cleaned and "required" not in cleaned:
                cleaned["required"] = list(cleaned["properties"].keys())

        # Ensure array items have descriptions
        if cleaned.get("type") == "array" and "items" in cleaned:
            items = cleaned["items"]
            if isinstance(items, dict):
                if "description" not in items:
                    items["description"] = f"{field_name} item" if field_name else "array item"
                # Recursively ensure nested object items also have required
                if items.get("type") == "object" and "properties" in items and "required" not in items:
                    items["required"] = list(items["properties"].keys())

        # Top-level description fallback
        if field_name and "description" not in cleaned and cleaned.get("type") is not None:
            cleaned["description"] = field_name.replace("_", " ")

        return cleaned

    return _clean(schema)


_THINKING_BUDGETS: dict[str, int] = {
    "low": 2000,
    "medium": 5000,
    "high": 10000,
}


class GoogleProvider(BaseProvider):
    """Provider strategy for Google Gemini models."""

    def prepare_schema(self, raw_schema: dict) -> dict:
        resolved = resolve_refs(dict(raw_schema))
        return _clean_schema_for_google(resolved)

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
