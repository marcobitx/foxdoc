# backend/tests/test_provider_registry.py
# Unit tests for GenericProvider and the provider registry
# Validates schema cleaning, response format, messages, thinking, caching, and dispatch
# Related: providers/generic.py, providers/registry.py, providers/base.py

import copy

import pytest

from app.services.providers.anthropic import AnthropicProvider
from app.services.providers.generic import GenericProvider, _clean_schema_generic
from app.services.providers.registry import _instances, get_provider


@pytest.fixture
def provider():
    return GenericProvider()


@pytest.fixture(autouse=True)
def clear_registry_cache():
    """Ensure each test starts with a clean registry cache."""
    _instances.clear()
    yield
    _instances.clear()


# ---------------------------------------------------------------------------
# Registry — get_provider dispatch
# ---------------------------------------------------------------------------

class TestGetProviderDispatch:
    def test_anthropic_prefix(self):
        p = get_provider("anthropic/claude-sonnet-4")
        assert isinstance(p, AnthropicProvider)

    def test_openai_prefix(self):
        # OpenAIProvider not yet implemented, falls back to GenericProvider
        p = get_provider("openai/gpt-5.1-codex-mini")
        assert isinstance(p, GenericProvider)

    def test_google_prefix(self):
        # GoogleProvider not yet implemented, falls back to GenericProvider
        p = get_provider("google/gemini-3.1-pro-preview")
        assert isinstance(p, GenericProvider)

    def test_unknown_prefix_meta_llama(self):
        p = get_provider("meta-llama/llama-3-70b")
        assert isinstance(p, GenericProvider)

    def test_unknown_prefix_deepseek(self):
        p = get_provider("deepseek/deepseek-r1")
        assert isinstance(p, GenericProvider)

    def test_unknown_prefix_mistral(self):
        p = get_provider("mistralai/mistral-large")
        assert isinstance(p, GenericProvider)


# ---------------------------------------------------------------------------
# Registry — singleton caching
# ---------------------------------------------------------------------------

class TestGetProviderCaching:
    def test_same_type_returns_same_instance(self):
        p1 = get_provider("anthropic/claude-sonnet-4")
        p2 = get_provider("anthropic/claude-3-opus")
        assert p1 is p2

    def test_different_unknown_models_share_generic(self):
        p1 = get_provider("meta-llama/llama-3-70b")
        p2 = get_provider("deepseek/deepseek-r1")
        assert p1 is p2

    def test_different_providers_are_different_instances(self):
        p_anthropic = get_provider("anthropic/claude-sonnet-4")
        p_generic = get_provider("meta-llama/llama-3-70b")
        assert p_anthropic is not p_generic


# ---------------------------------------------------------------------------
# GenericProvider — prepare_schema
# ---------------------------------------------------------------------------

class TestGenericPrepareSchema:
    def test_removes_title_and_default_keeps_description(self, provider):
        raw = {
            "type": "object",
            "title": "MyModel",
            "description": "A model",
            "properties": {
                "name": {
                    "type": "string",
                    "title": "Name",
                    "description": "The name",
                    "default": "foo",
                },
            },
            "required": ["name"],
        }
        result = provider.prepare_schema(raw)
        assert "title" not in result
        assert result.get("description") == "A model"
        prop = result["properties"]["name"]
        assert "title" not in prop
        assert "default" not in prop
        assert prop["description"] == "The name"

    def test_adds_additional_properties_false(self, provider):
        raw = {
            "type": "object",
            "properties": {"a": {"type": "string"}},
        }
        result = provider.prepare_schema(raw)
        assert result["additionalProperties"] is False

    def test_all_properties_in_required(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "a": {"type": "string"},
                "b": {"type": "integer"},
                "c": {"type": "boolean"},
            },
        }
        result = provider.prepare_schema(raw)
        assert set(result["required"]) == {"a", "b", "c"}

    def test_adds_fallback_description(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "contract_value": {"type": "number"},
            },
        }
        result = provider.prepare_schema(raw)
        assert result["properties"]["contract_value"]["description"] == "contract value"

    def test_preserves_existing_description(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Full name"},
            },
        }
        result = provider.prepare_schema(raw)
        assert result["properties"]["name"]["description"] == "Full name"

    def test_resolves_refs(self, provider):
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
        assert "$ref" not in str(result)
        assert "$defs" not in result
        child = result["properties"]["child"]
        assert child["type"] == "object"
        assert "x" in child["properties"]

    def test_flattens_nullable_anyof_primitive(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "score": {
                    "anyOf": [
                        {"type": "number"},
                        {"type": "null"},
                    ]
                },
            },
        }
        result = provider.prepare_schema(raw)
        prop = result["properties"]["score"]
        assert "anyOf" not in prop
        assert prop["type"] == ["number", "null"]

    def test_keeps_anyof_for_object_types(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "details": {
                    "anyOf": [
                        {"type": "object", "properties": {"a": {"type": "string"}}},
                        {"type": "null"},
                    ]
                },
            },
        }
        result = provider.prepare_schema(raw)
        prop = result["properties"]["details"]
        assert "anyOf" in prop

    def test_nested_object_cleaned_recursively(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "nested": {
                    "type": "object",
                    "title": "Nested",
                    "properties": {"b": {"type": "string", "title": "B"}},
                }
            },
        }
        result = provider.prepare_schema(raw)
        nested = result["properties"]["nested"]
        assert "title" not in nested
        assert nested["additionalProperties"] is False
        assert nested["required"] == ["b"]

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
        assert item_schema["description"] == "One item"
        assert item_schema["additionalProperties"] is False

    def test_does_not_mutate_input(self, provider):
        raw = {
            "type": "object",
            "title": "Root",
            "properties": {"a": {"type": "string", "title": "A"}},
        }
        original = copy.deepcopy(raw)
        provider.prepare_schema(raw)
        assert raw.get("title") == original.get("title")


# ---------------------------------------------------------------------------
# GenericProvider — build_response_format
# ---------------------------------------------------------------------------

class TestGenericBuildResponseFormat:
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
# GenericProvider — build_messages
# ---------------------------------------------------------------------------

class TestGenericBuildMessages:
    def test_standard_format_no_cache_control(self, provider):
        msgs = provider.build_messages("You are helpful.", "Hello")
        sys_msg = msgs[0]
        assert sys_msg["role"] == "system"
        assert sys_msg["content"] == "You are helpful."
        assert "cache_control" not in str(sys_msg)

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
# GenericProvider — build_thinking_config
# ---------------------------------------------------------------------------

class TestGenericBuildThinkingConfig:
    def test_off_returns_none(self, provider):
        assert provider.build_thinking_config("off") is None

    def test_low_budget(self, provider):
        assert provider.build_thinking_config("low") == {"type": "enabled", "budget_tokens": 2000}

    def test_medium_budget(self, provider):
        assert provider.build_thinking_config("medium") == {"type": "enabled", "budget_tokens": 5000}

    def test_high_budget(self, provider):
        assert provider.build_thinking_config("high") == {"type": "enabled", "budget_tokens": 10000}

    def test_unknown_returns_none(self, provider):
        assert provider.build_thinking_config("turbo") is None


# ---------------------------------------------------------------------------
# GenericProvider — get_temperature
# ---------------------------------------------------------------------------

class TestGenericGetTemperature:
    def test_returns_requested_temp_as_is(self, provider):
        assert provider.get_temperature(0.7, "off") == 0.7

    def test_returns_requested_temp_even_with_thinking(self, provider):
        assert provider.get_temperature(0.3, "high") == 0.3

    def test_zero_temp(self, provider):
        assert provider.get_temperature(0.0, "medium") == 0.0


# ---------------------------------------------------------------------------
# GenericProvider — supports_native_pdf
# ---------------------------------------------------------------------------

class TestGenericSupportsNativePdf:
    def test_returns_false(self, provider):
        assert provider.supports_native_pdf() is False


# ---------------------------------------------------------------------------
# _clean_schema_generic (internal helper)
# ---------------------------------------------------------------------------

class TestCleanSchemaGenericHelper:
    def test_empty_dict(self):
        assert _clean_schema_generic({}) == {}

    def test_non_object_type_no_additional_properties(self):
        result = _clean_schema_generic({"type": "string", "title": "S"})
        assert result == {"type": "string"}
        assert "additionalProperties" not in result

    def test_preserves_additional_properties_if_set(self):
        result = _clean_schema_generic({
            "type": "object",
            "properties": {"a": {"type": "string"}},
            "additionalProperties": True,
        })
        assert result["additionalProperties"] is True
