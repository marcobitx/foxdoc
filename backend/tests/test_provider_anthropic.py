# backend/tests/test_provider_anthropic.py
# Unit tests for AnthropicProvider strategy
# Validates schema handling, response format, messages, thinking, temperature,
# PDF support, and provider routing
# Related: providers/anthropic.py, providers/base.py

import json

import pytest

from app.services.providers.anthropic import AnthropicProvider


@pytest.fixture
def provider():
    return AnthropicProvider()


# ---------------------------------------------------------------------------
# prepare_schema — returns raw schema as-is (goes into system prompt, not grammar)
# ---------------------------------------------------------------------------

class TestPrepareSchema:
    def test_returns_schema_as_dict(self, provider):
        raw = {"type": "object", "properties": {"a": {"type": "string"}}}
        result = provider.prepare_schema(raw)
        assert result == raw

    def test_does_not_mutate_input(self, provider):
        raw = {"type": "object", "title": "Root", "properties": {"a": {"type": "string"}}}
        import copy
        original = copy.deepcopy(raw)
        provider.prepare_schema(raw)
        assert raw == original

    def test_preserves_defs_and_refs(self, provider):
        raw = {
            "type": "object",
            "$defs": {"Inner": {"type": "object", "properties": {"x": {"type": "integer"}}}},
            "properties": {"child": {"$ref": "#/$defs/Inner"}},
        }
        result = provider.prepare_schema(raw)
        assert "$defs" in result
        assert result["properties"]["child"]["$ref"] == "#/$defs/Inner"


# ---------------------------------------------------------------------------
# build_response_format — uses json_object (no grammar compilation)
# ---------------------------------------------------------------------------

class TestBuildResponseFormat:
    def test_returns_none(self, provider):
        """Anthropic skips response_format — schema is prompt-injected instead."""
        schema = {"type": "object", "properties": {}}
        result = provider.build_response_format(schema, "extraction")
        assert result is None

    def test_stores_pending_schema(self, provider):
        schema = {"type": "object", "properties": {"x": {"type": "integer"}}}
        provider.build_response_format(schema, "my_schema")
        assert provider._pending_schema is schema
        assert provider._pending_schema_name == "my_schema"


# ---------------------------------------------------------------------------
# build_messages — injects schema into system prompt
# ---------------------------------------------------------------------------

class TestBuildMessages:
    def test_system_has_cache_control(self, provider):
        msgs = provider.build_messages("You are helpful.", "Hello")
        sys_msg = msgs[0]
        assert sys_msg["role"] == "system"
        content_block = sys_msg["content"][0]
        assert content_block["type"] == "text"
        assert content_block["cache_control"] == {"type": "ephemeral"}

    def test_injects_schema_into_system_prompt(self, provider):
        schema = {"type": "object", "properties": {"name": {"type": "string"}}}
        provider.build_response_format(schema, "TestSchema")
        msgs = provider.build_messages("Base system prompt.", "Hello")

        system_text = msgs[0]["content"][0]["text"]
        assert "Base system prompt." in system_text
        assert "TestSchema" in system_text
        assert '"name"' in system_text
        assert "json" in system_text.lower()

    def test_clears_pending_schema_after_build(self, provider):
        schema = {"type": "object", "properties": {}}
        provider.build_response_format(schema, "Test")
        provider.build_messages("sys", "usr")
        assert provider._pending_schema is None

    def test_no_schema_injection_without_pending(self, provider):
        msgs = provider.build_messages("System prompt only.", "Hello")
        system_text = msgs[0]["content"][0]["text"]
        assert system_text == "System prompt only."

    def test_user_message_string(self, provider):
        msgs = provider.build_messages("sys", "user query")
        assert msgs[1]["role"] == "user"
        assert msgs[1]["content"] == "user query"

    def test_user_message_list(self, provider):
        user_content = [
            {"type": "text", "text": "describe this"},
            {"type": "image_url", "image_url": {"url": "data:image/png;base64,abc"}},
        ]
        msgs = provider.build_messages("sys", user_content)
        assert msgs[1]["content"] is user_content

    def test_returns_two_messages(self, provider):
        msgs = provider.build_messages("sys", "usr")
        assert len(msgs) == 2


# ---------------------------------------------------------------------------
# build_thinking_config
# ---------------------------------------------------------------------------

class TestBuildThinkingConfig:
    def test_off_returns_none(self, provider):
        assert provider.build_thinking_config("off") is None

    def test_low_budget(self, provider):
        result = provider.build_thinking_config("low")
        assert result == {"max_tokens": 2000}

    def test_medium_budget(self, provider):
        result = provider.build_thinking_config("medium")
        assert result == {"max_tokens": 5000}

    def test_high_budget(self, provider):
        result = provider.build_thinking_config("high")
        assert result == {"max_tokens": 10000}

    def test_unknown_returns_none(self, provider):
        assert provider.build_thinking_config("turbo") is None


# ---------------------------------------------------------------------------
# get_temperature
# ---------------------------------------------------------------------------

class TestGetTemperature:
    def test_thinking_off_uses_requested(self, provider):
        assert provider.get_temperature(0.7, "off") == 0.7

    def test_thinking_low_forces_one(self, provider):
        assert provider.get_temperature(0.3, "low") == 1.0

    def test_thinking_medium_forces_one(self, provider):
        assert provider.get_temperature(0.0, "medium") == 1.0

    def test_thinking_high_forces_one(self, provider):
        assert provider.get_temperature(0.5, "high") == 1.0


# ---------------------------------------------------------------------------
# supports_native_pdf
# ---------------------------------------------------------------------------

class TestSupportsNativePdf:
    def test_returns_true(self, provider):
        assert provider.supports_native_pdf() is True


# ---------------------------------------------------------------------------
# get_provider_routing — forces Anthropic backend via OpenRouter
# ---------------------------------------------------------------------------

class TestGetProviderRouting:
    def test_routes_to_anthropic_only(self, provider):
        routing = provider.get_provider_routing()
        assert routing is not None
        assert routing["only"] == ["anthropic"]
        assert routing["allow_fallbacks"] is False
