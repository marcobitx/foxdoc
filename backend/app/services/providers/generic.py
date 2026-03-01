# backend/app/services/providers/generic.py
# LLM provider strategy for unknown/generic models (via OpenRouter)
# Strictest common denominator: all props required, additionalProperties false
# Related: base.py, schema_utils.py, llm.py

from app.services.providers.base import BaseProvider
from app.services.schema_utils import flatten_nullable_anyof_openai, resolve_refs


_THINKING_BUDGETS: dict[str, int] = {
    "low": 2000,
    "medium": 5000,
    "high": 10000,
}


def _clean_schema_generic(schema: dict) -> dict:
    """Clean and tighten JSON schema for unknown providers.

    - Flattens anyOf nullable to type: [T, "null"] (OpenAI-compatible, safest for OpenRouter)
    - Removes title, default (KEEPS description)
    - Adds fallback description where missing
    - Adds additionalProperties: false on all object types
    - ALL properties forced into required array
    """

    def _clean(node: dict, field_name: str = "") -> dict:
        node = flatten_nullable_anyof_openai(node)

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
            if "properties" in cleaned:
                cleaned["required"] = list(cleaned["properties"].keys())

        return cleaned

    return _clean(schema)


class GenericProvider(BaseProvider):
    """Provider strategy for unknown models — strictest common denominator."""

    def prepare_schema(self, raw_schema: dict) -> dict:
        resolved = resolve_refs(dict(raw_schema))
        return _clean_schema_generic(resolved)

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
