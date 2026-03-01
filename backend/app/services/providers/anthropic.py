# backend/app/services/providers/anthropic.py
# LLM provider strategy for Anthropic Claude models (via OpenRouter)
# Handles Claude-specific schema cleaning, cache_control, and thinking budgets
# Related: base.py, schema_utils.py, llm.py

import json

from app.services.providers.base import BaseProvider


_THINKING_BUDGETS: dict[str, int] = {
    "low": 2000,
    "medium": 5000,
    "high": 10000,
}


class AnthropicProvider(BaseProvider):
    """Provider strategy for Anthropic Claude models.

    Does NOT use response_format at all — avoids both grammar compilation
    limits (24 optional params / 16 union types) and the Anthropic constraint
    that response_format cannot be combined with extended thinking.

    The full JSON schema is injected into the system prompt instead.
    Claude follows it reliably (~98%+) and the existing retry/validation +
    json-repair layer handles the rare deviation.
    """

    def prepare_schema(self, raw_schema: dict) -> dict:
        # Return raw Pydantic schema as-is — it goes into the system prompt,
        # not into a grammar compiler, so no cleaning/resolving needed.
        return dict(raw_schema)

    def build_response_format(self, cleaned_schema: dict, schema_name: str) -> dict | None:
        # No response_format for Anthropic:
        # 1. json_schema triggers grammar compilation (hard limits)
        # 2. json_object conflicts with extended thinking
        # Schema is embedded in the system prompt via build_messages instead.
        self._pending_schema = cleaned_schema
        self._pending_schema_name = schema_name
        return None

    def build_messages(self, system: str, user: str | list[dict]) -> list[dict]:
        # Inject the JSON schema into the system prompt so Claude knows
        # exactly what structure to produce.
        schema = getattr(self, "_pending_schema", None)
        schema_name = getattr(self, "_pending_schema_name", "Result")

        if schema:
            schema_instruction = (
                f"\n\n## Required JSON output format\n"
                f"You MUST respond with a single valid JSON object that strictly follows "
                f"this JSON schema (named '{schema_name}'):\n\n"
                f"{json.dumps(schema, indent=2)}\n\n"
                f"CRITICAL RULES:\n"
                f"- Output ONLY raw JSON starting with {{ and ending with }}\n"
                f"- Do NOT wrap in markdown code fences (no ```)\n"
                f"- Do NOT add any text before or after the JSON\n"
                f"- All string values must use double quotes\n"
                f"- Use null for missing/unknown values"
            )
            system = system + schema_instruction
            # Clear pending state
            self._pending_schema = None
            self._pending_schema_name = None

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

    def get_provider_routing(self) -> dict | None:
        # Route directly to Anthropic backend — avoids Amazon Bedrock / other
        # providers that impose grammar compilation limits.
        return {
            "only": ["anthropic"],
            "allow_fallbacks": False,
        }
