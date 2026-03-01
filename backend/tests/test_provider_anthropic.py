# backend/tests/test_provider_anthropic.py
# Unit tests for AnthropicProvider strategy
# Validates schema cleaning, response format, messages, thinking, temperature, PDF support
# Related: providers/anthropic.py, providers/base.py

import pytest

from app.services.providers.anthropic import AnthropicProvider, _clean_schema_for_anthropic


@pytest.fixture
def provider():
    return AnthropicProvider()


# ---------------------------------------------------------------------------
# prepare_schema
# ---------------------------------------------------------------------------

class TestPrepareSchema:
    def test_removes_title_description_default(self, provider):
        raw = {
            "type": "object",
            "title": "MyModel",
            "description": "A model",
            "properties": {
                "name": {"type": "string", "title": "Name", "default": "foo"},
            },
            "required": ["name"],
        }
        result = provider.prepare_schema(raw)
        assert "title" not in result
        assert "description" not in result
        assert "title" not in result["properties"]["name"]
        assert "default" not in result["properties"]["name"]

    def test_adds_additional_properties_false(self, provider):
        raw = {
            "type": "object",
            "properties": {"a": {"type": "string"}},
            "required": ["a"],
        }
        result = provider.prepare_schema(raw)
        assert result["additionalProperties"] is False

    def test_preserves_existing_additional_properties(self, provider):
        raw = {
            "type": "object",
            "properties": {"a": {"type": "string"}},
            "additionalProperties": True,
        }
        result = provider.prepare_schema(raw)
        assert result["additionalProperties"] is True

    def test_preserves_refs(self, provider):
        """Anthropic supports $defs/$ref natively — do NOT inline them.

        Inlining causes 'too many optional parameters' errors when schemas
        have many nested Optional fields (e.g. ExtractionResult with 79 params > 24 limit).
        """
        raw = {
            "type": "object",
            "$defs": {
                "Inner": {
                    "type": "object",
                    "properties": {"x": {"type": "integer"}},
                }
            },
            "properties": {
                "child": {"$ref": "#/$defs/Inner"},
            },
            "required": ["child"],
        }
        result = provider.prepare_schema(raw)
        # $defs and $ref must be preserved
        assert "$defs" in result
        assert result["properties"]["child"]["$ref"] == "#/$defs/Inner"
        # $defs content should still be cleaned (titles removed, additionalProperties added)
        inner = result["$defs"]["Inner"]
        assert inner["additionalProperties"] is False

    def test_nested_object_gets_additional_properties(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "nested": {
                    "type": "object",
                    "properties": {"b": {"type": "string"}},
                }
            },
        }
        result = provider.prepare_schema(raw)
        assert result["additionalProperties"] is False
        assert result["properties"]["nested"]["additionalProperties"] is False

    def test_cleans_inside_arrays(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "title": "ItemList",
                    "items": {
                        "type": "object",
                        "title": "Item",
                        "description": "One item",
                        "properties": {"v": {"type": "number"}},
                    },
                }
            },
        }
        result = provider.prepare_schema(raw)
        arr = result["properties"]["items"]
        assert "title" not in arr
        item_schema = arr["items"]
        assert "title" not in item_schema
        assert "description" not in item_schema
        assert item_schema["additionalProperties"] is False

    def test_does_not_mutate_input(self, provider):
        raw = {
            "type": "object",
            "title": "Root",
            "properties": {"a": {"type": "string", "title": "A"}},
        }
        import copy
        original = copy.deepcopy(raw)
        provider.prepare_schema(raw)
        # $defs popping mutates, but title should still be there if no $defs
        assert raw.get("title") == original.get("title")


# ---------------------------------------------------------------------------
# build_response_format
# ---------------------------------------------------------------------------

class TestBuildResponseFormat:
    def test_uses_json_schema_type(self, provider):
        schema = {"type": "object", "properties": {}}
        result = provider.build_response_format(schema, "extraction")
        assert result["type"] == "json_schema"

    def test_includes_name_and_schema(self, provider):
        schema = {"type": "object", "properties": {"x": {"type": "integer"}}}
        result = provider.build_response_format(schema, "my_schema")
        assert result["json_schema"]["name"] == "my_schema"
        assert result["json_schema"]["schema"] is schema


# ---------------------------------------------------------------------------
# build_messages
# ---------------------------------------------------------------------------

class TestBuildMessages:
    def test_system_has_cache_control(self, provider):
        msgs = provider.build_messages("You are helpful.", "Hello")
        sys_msg = msgs[0]
        assert sys_msg["role"] == "system"
        content_block = sys_msg["content"][0]
        assert content_block["type"] == "text"
        assert content_block["text"] == "You are helpful."
        assert content_block["cache_control"] == {"type": "ephemeral"}

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
        assert result == {"type": "enabled", "budget_tokens": 2000}

    def test_medium_budget(self, provider):
        result = provider.build_thinking_config("medium")
        assert result == {"type": "enabled", "budget_tokens": 5000}

    def test_high_budget(self, provider):
        result = provider.build_thinking_config("high")
        assert result == {"type": "enabled", "budget_tokens": 10000}

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
# _clean_schema_for_anthropic (internal helper)
# ---------------------------------------------------------------------------

class TestCleanSchemaHelper:
    def test_empty_dict(self):
        assert _clean_schema_for_anthropic({}) == {}

    def test_non_object_type_no_additional_properties(self):
        result = _clean_schema_for_anthropic({"type": "string", "title": "S"})
        assert result == {"type": "string"}
        assert "additionalProperties" not in result

    def test_deeply_nested(self):
        schema = {
            "type": "object",
            "title": "Root",
            "properties": {
                "level1": {
                    "type": "object",
                    "description": "L1",
                    "properties": {
                        "level2": {
                            "type": "object",
                            "default": {},
                            "properties": {
                                "value": {"type": "string", "title": "V"},
                            },
                        }
                    },
                }
            },
        }
        result = _clean_schema_for_anthropic(schema)
        assert "title" not in result
        l1 = result["properties"]["level1"]
        assert "description" not in l1
        assert l1["additionalProperties"] is False
        l2 = l1["properties"]["level2"]
        assert "default" not in l2
        assert l2["additionalProperties"] is False
        assert l2["properties"]["value"] == {"type": "string"}
