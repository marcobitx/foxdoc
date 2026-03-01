# backend/tests/test_provider_google.py
# Unit tests for GoogleProvider strategy
# Validates schema cleaning, response format, messages, thinking, temperature, PDF support
# Related: providers/google.py, providers/base.py

import copy

import pytest

from app.services.providers.google import GoogleProvider, _clean_schema_for_google


@pytest.fixture
def provider():
    return GoogleProvider()


# ---------------------------------------------------------------------------
# prepare_schema
# ---------------------------------------------------------------------------

class TestPrepareSchema:
    def test_removes_title_and_default_but_keeps_description(self, provider):
        raw = {
            "type": "object",
            "title": "MyModel",
            "description": "A model",
            "properties": {
                "name": {
                    "type": "string",
                    "title": "Name",
                    "default": "foo",
                    "description": "The name",
                },
            },
            "required": ["name"],
        }
        result = provider.prepare_schema(raw)
        assert "title" not in result
        assert result["description"] == "A model"
        assert "title" not in result["properties"]["name"]
        assert "default" not in result["properties"]["name"]
        assert result["properties"]["name"]["description"] == "The name"

    def test_adds_fallback_description_for_missing_properties(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "supplier_name": {"type": "string"},
                "total_amount": {"type": "number"},
            },
        }
        result = provider.prepare_schema(raw)
        assert result["properties"]["supplier_name"]["description"] == "supplier name"
        assert result["properties"]["total_amount"]["description"] == "total amount"

    def test_adds_additional_properties_false(self, provider):
        raw = {
            "type": "object",
            "properties": {"a": {"type": "string", "description": "a"}},
            "required": ["a"],
        }
        result = provider.prepare_schema(raw)
        assert result["additionalProperties"] is False

    def test_preserves_existing_additional_properties(self, provider):
        raw = {
            "type": "object",
            "properties": {"a": {"type": "string", "description": "a"}},
            "additionalProperties": True,
        }
        result = provider.prepare_schema(raw)
        assert result["additionalProperties"] is True

    def test_adds_required_array_when_missing(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "x": {"type": "string", "description": "x"},
                "y": {"type": "integer", "description": "y"},
            },
        }
        result = provider.prepare_schema(raw)
        assert set(result["required"]) == {"x", "y"}

    def test_preserves_existing_required_array(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "x": {"type": "string", "description": "x"},
                "y": {"type": "integer", "description": "y"},
            },
            "required": ["x"],
        }
        result = provider.prepare_schema(raw)
        assert result["required"] == ["x"]

    def test_resolves_refs(self, provider):
        raw = {
            "type": "object",
            "$defs": {
                "Inner": {
                    "type": "object",
                    "properties": {"x": {"type": "integer", "description": "x val"}},
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

    def test_flattens_nullable_anyof(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "value": {
                    "anyOf": [
                        {"type": "number", "description": "the number"},
                        {"type": "null"},
                    ]
                }
            },
        }
        result = provider.prepare_schema(raw)
        prop = result["properties"]["value"]
        assert "anyOf" not in prop
        assert prop["type"] == "number"
        assert prop["description"] == "the number"

    def test_nested_object_gets_additional_properties_and_required(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "nested": {
                    "type": "object",
                    "description": "nested obj",
                    "properties": {
                        "b": {"type": "string", "description": "b val"},
                    },
                }
            },
        }
        result = provider.prepare_schema(raw)
        nested = result["properties"]["nested"]
        assert nested["additionalProperties"] is False
        assert nested["required"] == ["b"]

    def test_array_items_get_description(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "description": "tag list",
                    "items": {"type": "string"},
                }
            },
        }
        result = provider.prepare_schema(raw)
        items = result["properties"]["tags"]["items"]
        assert "description" in items
        assert items["description"] == "tags"

    def test_array_items_preserve_existing_description(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "description": "tag list",
                    "items": {"type": "string", "description": "a tag"},
                }
            },
        }
        result = provider.prepare_schema(raw)
        assert result["properties"]["tags"]["items"]["description"] == "a tag"

    def test_array_object_items_get_required(self, provider):
        raw = {
            "type": "object",
            "properties": {
                "lots": {
                    "type": "array",
                    "description": "lot list",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "lot name"},
                            "value": {"type": "number", "description": "lot value"},
                        },
                    },
                }
            },
        }
        result = provider.prepare_schema(raw)
        items = result["properties"]["lots"]["items"]
        assert set(items["required"]) == {"name", "value"}
        assert items["additionalProperties"] is False

    def test_does_not_mutate_input(self, provider):
        raw = {
            "type": "object",
            "title": "Root",
            "properties": {"a": {"type": "string", "title": "A"}},
        }
        original = copy.deepcopy(raw)
        provider.prepare_schema(raw)
        assert raw.get("title") == original.get("title")

    def test_deeply_nested_cleaning(self, provider):
        raw = {
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
        result = provider.prepare_schema(raw)
        assert "title" not in result
        l1 = result["properties"]["level1"]
        assert l1["description"] == "L1"
        assert l1["additionalProperties"] is False
        l2 = l1["properties"]["level2"]
        assert "default" not in l2
        assert l2["additionalProperties"] is False
        assert "description" in l2["properties"]["value"]


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
    def test_system_message_is_plain_string(self, provider):
        msgs = provider.build_messages("You are helpful.", "Hello")
        sys_msg = msgs[0]
        assert sys_msg["role"] == "system"
        assert sys_msg["content"] == "You are helpful."

    def test_no_cache_control(self, provider):
        """Google messages should NOT have cache_control (unlike Anthropic)."""
        msgs = provider.build_messages("sys", "usr")
        assert "cache_control" not in str(msgs)

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
    def test_returns_requested_temp_always(self, provider):
        assert provider.get_temperature(0.7, "off") == 0.7

    def test_thinking_does_not_override(self, provider):
        """Unlike Anthropic, Google does not force temp=1 for thinking."""
        assert provider.get_temperature(0.3, "low") == 0.3
        assert provider.get_temperature(0.0, "medium") == 0.0
        assert provider.get_temperature(0.5, "high") == 0.5


# ---------------------------------------------------------------------------
# supports_native_pdf
# ---------------------------------------------------------------------------

class TestSupportsNativePdf:
    def test_returns_false(self, provider):
        assert provider.supports_native_pdf() is False


# ---------------------------------------------------------------------------
# _clean_schema_for_google (internal helper)
# ---------------------------------------------------------------------------

class TestCleanSchemaHelper:
    def test_empty_dict(self):
        assert _clean_schema_for_google({}) == {}

    def test_non_object_type_no_additional_properties(self):
        result = _clean_schema_for_google({"type": "string", "title": "S"})
        assert result == {"type": "string"}
        assert "additionalProperties" not in result

    def test_string_type_gets_fallback_description_with_field_name(self):
        """When _clean is called with a field_name, strings get fallback descriptions."""
        # This is tested indirectly via properties
        schema = {
            "type": "object",
            "properties": {
                "my_field": {"type": "string"},
            },
        }
        result = _clean_schema_for_google(schema)
        assert result["properties"]["my_field"]["description"] == "my field"

    def test_nullable_anyof_with_object_type(self):
        schema = {
            "type": "object",
            "properties": {
                "detail": {
                    "anyOf": [
                        {
                            "type": "object",
                            "properties": {"k": {"type": "string", "description": "k"}},
                        },
                        {"type": "null"},
                    ],
                    "description": "detail info",
                }
            },
        }
        result = _clean_schema_for_google(schema)
        prop = result["properties"]["detail"]
        assert "anyOf" not in prop
        assert prop["type"] == "object"
        assert prop["description"] == "detail info"
        assert prop["additionalProperties"] is False
