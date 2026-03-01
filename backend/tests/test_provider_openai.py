# backend/tests/test_provider_openai.py
# Tests for the OpenAI GPT provider strategy
# Validates schema cleaning, response format, messages, thinking, temperature, PDF support
# Related: providers/openai.py, schema_utils.py

import pytest

from app.services.providers.openai import OpenAIProvider


@pytest.fixture
def provider():
    return OpenAIProvider()


# --- prepare_schema ---


class TestPrepareSchema:
    def test_removes_title_and_default(self, provider):
        schema = {
            "type": "object",
            "title": "MyModel",
            "properties": {
                "name": {"type": "string", "title": "Name", "default": "unknown"},
            },
        }
        result = provider.prepare_schema(schema)
        assert "title" not in result
        assert "title" not in result["properties"]["name"]
        assert "default" not in result["properties"]["name"]

    def test_keeps_description(self, provider):
        schema = {
            "type": "object",
            "description": "Top-level desc",
            "properties": {
                "name": {"type": "string", "description": "Field desc"},
            },
        }
        result = provider.prepare_schema(schema)
        assert result["description"] == "Top-level desc"
        assert result["properties"]["name"]["description"] == "Field desc"

    def test_adds_additional_properties_false(self, provider):
        schema = {
            "type": "object",
            "properties": {
                "nested": {
                    "type": "object",
                    "properties": {"x": {"type": "integer"}},
                }
            },
        }
        result = provider.prepare_schema(schema)
        assert result["additionalProperties"] is False
        assert result["properties"]["nested"]["additionalProperties"] is False

    def test_does_not_override_existing_additional_properties(self, provider):
        schema = {
            "type": "object",
            "additionalProperties": True,
            "properties": {"x": {"type": "string"}},
        }
        result = provider.prepare_schema(schema)
        assert result["additionalProperties"] is True

    def test_all_properties_in_required(self, provider):
        schema = {
            "type": "object",
            "properties": {
                "a": {"type": "string"},
                "b": {"type": "integer"},
                "c": {"type": "boolean"},
            },
        }
        result = provider.prepare_schema(schema)
        assert set(result["required"]) == {"a", "b", "c"}

    def test_nested_object_all_properties_required(self, provider):
        schema = {
            "type": "object",
            "properties": {
                "inner": {
                    "type": "object",
                    "properties": {
                        "x": {"type": "string"},
                        "y": {"type": "number"},
                    },
                }
            },
        }
        result = provider.prepare_schema(schema)
        inner = result["properties"]["inner"]
        assert set(inner["required"]) == {"x", "y"}

    def test_resolves_refs(self, provider):
        schema = {
            "type": "object",
            "properties": {
                "item": {"$ref": "#/$defs/Item"},
            },
            "$defs": {
                "Item": {
                    "type": "object",
                    "properties": {"name": {"type": "string"}},
                }
            },
        }
        result = provider.prepare_schema(schema)
        assert "$ref" not in result["properties"]["item"]
        assert result["properties"]["item"]["type"] == "object"
        assert "name" in result["properties"]["item"]["properties"]

    def test_flattens_nullable_primitive_anyof(self, provider):
        schema = {
            "type": "object",
            "properties": {
                "score": {
                    "anyOf": [
                        {"type": "number"},
                        {"type": "null"},
                    ]
                }
            },
        }
        result = provider.prepare_schema(schema)
        score = result["properties"]["score"]
        assert score["type"] == ["number", "null"]
        assert "anyOf" not in score

    def test_keeps_anyof_for_object_nullable(self, provider):
        schema = {
            "type": "object",
            "properties": {
                "details": {
                    "anyOf": [
                        {
                            "type": "object",
                            "properties": {"x": {"type": "string"}},
                        },
                        {"type": "null"},
                    ]
                }
            },
        }
        result = provider.prepare_schema(schema)
        details = result["properties"]["details"]
        assert "anyOf" in details

    def test_cleans_inside_array_items(self, provider):
        schema = {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "title": "ShouldBeRemoved",
                        "properties": {"val": {"type": "string", "default": "x"}},
                    },
                }
            },
        }
        result = provider.prepare_schema(schema)
        item_schema = result["properties"]["items"]["items"]
        assert "title" not in item_schema
        assert "default" not in item_schema["properties"]["val"]
        assert item_schema["additionalProperties"] is False
        assert item_schema["required"] == ["val"]


# --- build_response_format ---


class TestBuildResponseFormat:
    def test_structure(self, provider):
        schema = {"type": "object", "properties": {}}
        result = provider.build_response_format(schema, "extraction")
        assert result == {
            "type": "json_schema",
            "json_schema": {
                "name": "extraction",
                "schema": schema,
            },
        }


# --- build_messages ---


class TestBuildMessages:
    def test_string_user_content(self, provider):
        msgs = provider.build_messages("You are helpful.", "Hello")
        assert len(msgs) == 2
        assert msgs[0] == {"role": "system", "content": "You are helpful."}
        assert msgs[1] == {"role": "user", "content": "Hello"}

    def test_list_user_content(self, provider):
        user_parts = [
            {"type": "text", "text": "Analyze this"},
            {"type": "image_url", "image_url": {"url": "data:image/png;base64,abc"}},
        ]
        msgs = provider.build_messages("System prompt", user_parts)
        assert msgs[1]["content"] == user_parts

    def test_no_cache_control(self, provider):
        """OpenAI messages should NOT include cache_control (that's Anthropic-specific)."""
        msgs = provider.build_messages("System", "User")
        system_content = msgs[0]["content"]
        assert isinstance(system_content, str)
        assert "cache_control" not in str(msgs)


# --- build_thinking_config ---


class TestBuildThinkingConfig:
    def test_off_returns_none(self, provider):
        assert provider.build_thinking_config("off") is None

    def test_unknown_returns_none(self, provider):
        assert provider.build_thinking_config("extreme") is None

    @pytest.mark.parametrize(
        "level,expected_budget",
        [("low", 2000), ("medium", 5000), ("high", 10000)],
    )
    def test_budget_levels(self, provider, level, expected_budget):
        result = provider.build_thinking_config(level)
        assert result == {"type": "enabled", "budget_tokens": expected_budget}


# --- get_temperature ---


class TestGetTemperature:
    def test_returns_requested_temp(self, provider):
        assert provider.get_temperature(0.7, "off") == 0.7

    def test_returns_requested_temp_with_thinking(self, provider):
        """OpenAI does NOT force temperature when thinking is enabled."""
        assert provider.get_temperature(0.5, "high") == 0.5

    def test_zero_temp(self, provider):
        assert provider.get_temperature(0.0, "off") == 0.0


# --- supports_native_pdf ---


class TestSupportsNativePdf:
    def test_returns_false(self, provider):
        assert provider.supports_native_pdf() is False
