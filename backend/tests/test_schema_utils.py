# backend/tests/test_schema_utils.py
# Tests for shared JSON-schema utility functions
# Validates extract_json, resolve_refs, flatten_nullable_anyof, flatten_nullable_anyof_openai
# Related: backend/app/services/schema_utils.py

import json

import pytest

from app.services.schema_utils import (
    extract_json,
    flatten_nullable_anyof,
    flatten_nullable_anyof_openai,
    resolve_refs,
)


# ── extract_json ──────────────────────────────────────────────────────────────


class TestExtractJson:
    def test_raw_json(self):
        raw = '{"key": "value"}'
        assert extract_json(raw) == '{"key": "value"}'

    def test_markdown_fences(self):
        raw = '```json\n{"key": "value"}\n```'
        assert extract_json(raw) == '{"key": "value"}'

    def test_markdown_fences_no_language(self):
        raw = '```\n{"key": "value"}\n```'
        assert extract_json(raw) == '{"key": "value"}'

    def test_surrounding_text(self):
        raw = 'Here is the result:\n{"key": "value"}\nHope that helps!'
        assert extract_json(raw) == '{"key": "value"}'

    def test_nested_braces(self):
        raw = '{"a": {"b": 1}, "c": 2}'
        result = json.loads(extract_json(raw))
        assert result == {"a": {"b": 1}, "c": 2}

    def test_string_with_braces(self):
        raw = '{"msg": "hello {world}"}'
        result = json.loads(extract_json(raw))
        assert result == {"msg": "hello {world}"}

    def test_no_json_object(self):
        raw = "no json here"
        assert extract_json(raw) == "no json here"

    def test_whitespace_padding(self):
        raw = "   \n  {\"a\": 1}  \n  "
        result = json.loads(extract_json(raw))
        assert result == {"a": 1}

    def test_escaped_quotes_in_string(self):
        raw = r'{"key": "say \"hello\""}'
        result = extract_json(raw)
        assert '"key"' in result
        assert "{" in result

    def test_markdown_fences_with_trailing_whitespace(self):
        raw = '```json\n{"x": 1}\n```  \n'
        assert json.loads(extract_json(raw)) == {"x": 1}


# ── resolve_refs ──────────────────────────────────────────────────────────────


class TestResolveRefs:
    def test_no_defs_passthrough(self):
        schema = {"type": "object", "properties": {"name": {"type": "string"}}}
        result = resolve_refs(schema)
        assert result == {"type": "object", "properties": {"name": {"type": "string"}}}

    def test_simple_ref(self):
        schema = {
            "type": "object",
            "properties": {
                "item": {"$ref": "#/$defs/Item"},
            },
            "$defs": {
                "Item": {"type": "object", "properties": {"id": {"type": "integer"}}},
            },
        }
        result = resolve_refs(schema)
        assert "$ref" not in json.dumps(result)
        assert result["properties"]["item"]["type"] == "object"
        assert result["properties"]["item"]["properties"]["id"]["type"] == "integer"

    def test_definitions_key(self):
        """Should handle 'definitions' as well as '$defs'."""
        schema = {
            "type": "object",
            "properties": {
                "item": {"$ref": "#/definitions/Item"},
            },
            "definitions": {
                "Item": {"type": "string"},
            },
        }
        result = resolve_refs(schema)
        assert result["properties"]["item"]["type"] == "string"

    def test_circular_ref(self):
        schema = {
            "type": "object",
            "properties": {
                "child": {"$ref": "#/$defs/Node"},
            },
            "$defs": {
                "Node": {
                    "type": "object",
                    "properties": {
                        "child": {"$ref": "#/$defs/Node"},
                    },
                },
            },
        }
        result = resolve_refs(schema)
        # Top-level child should be resolved
        child = result["properties"]["child"]
        assert child["type"] == "object"
        # Nested child should be a generic object (cycle broken)
        nested = child["properties"]["child"]
        assert nested["type"] == "object"
        assert "$ref" not in json.dumps(nested)

    def test_allof_flattening(self):
        schema = {
            "type": "object",
            "properties": {
                "item": {
                    "allOf": [{"$ref": "#/$defs/Item"}],
                    "description": "An item",
                },
            },
            "$defs": {
                "Item": {"type": "string"},
            },
        }
        result = resolve_refs(schema)
        prop = result["properties"]["item"]
        assert "allOf" not in prop
        assert prop["type"] == "string"
        assert prop["description"] == "An item"

    def test_ref_with_sibling_keys(self):
        schema = {
            "type": "object",
            "properties": {
                "item": {"$ref": "#/$defs/Item", "description": "desc"},
            },
            "$defs": {
                "Item": {"type": "integer"},
            },
        }
        result = resolve_refs(schema)
        prop = result["properties"]["item"]
        assert prop["type"] == "integer"
        assert prop["description"] == "desc"

    def test_ref_in_array_items(self):
        schema = {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {"$ref": "#/$defs/Thing"},
                },
            },
            "$defs": {
                "Thing": {"type": "number"},
            },
        }
        result = resolve_refs(schema)
        assert result["properties"]["items"]["items"]["type"] == "number"

    def test_ref_in_list_elements(self):
        schema = {
            "anyOf": [
                {"$ref": "#/$defs/A"},
                {"$ref": "#/$defs/B"},
            ],
            "$defs": {
                "A": {"type": "string"},
                "B": {"type": "integer"},
            },
        }
        result = resolve_refs(schema)
        assert result["anyOf"][0]["type"] == "string"
        assert result["anyOf"][1]["type"] == "integer"


# ── flatten_nullable_anyof ────────────────────────────────────────────────────


class TestFlattenNullableAnyof:
    def test_nullable_pattern(self):
        node = {
            "anyOf": [{"type": "string"}, {"type": "null"}],
        }
        result = flatten_nullable_anyof(node)
        assert "anyOf" not in result
        assert result["type"] == "string"

    def test_nullable_with_description(self):
        node = {
            "anyOf": [{"type": "number"}, {"type": "null"}],
            "description": "A value",
        }
        result = flatten_nullable_anyof(node)
        assert result["type"] == "number"
        assert result["description"] == "A value"

    def test_non_nullable_passthrough(self):
        node = {"type": "string"}
        result = flatten_nullable_anyof(node)
        assert result == {"type": "string"}

    def test_three_variants_passthrough(self):
        node = {
            "anyOf": [{"type": "string"}, {"type": "integer"}, {"type": "null"}],
        }
        result = flatten_nullable_anyof(node)
        # 3 variants: should not flatten
        assert "anyOf" in result

    def test_two_non_null_variants(self):
        node = {
            "anyOf": [{"type": "string"}, {"type": "integer"}],
        }
        result = flatten_nullable_anyof(node)
        assert "anyOf" in result

    def test_no_anyof_key(self):
        node = {"type": "object", "properties": {}}
        assert flatten_nullable_anyof(node) == node

    def test_null_first(self):
        """null variant can appear first."""
        node = {
            "anyOf": [{"type": "null"}, {"type": "boolean"}],
        }
        result = flatten_nullable_anyof(node)
        assert result["type"] == "boolean"
        assert "anyOf" not in result


# ── flatten_nullable_anyof_openai ─────────────────────────────────────────────


class TestFlattenNullableAnyofOpenai:
    def test_primitive_nullable(self):
        node = {
            "anyOf": [{"type": "number"}, {"type": "null"}],
        }
        result = flatten_nullable_anyof_openai(node)
        assert result["type"] == ["number", "null"]
        assert "anyOf" not in result

    def test_string_nullable(self):
        node = {
            "anyOf": [{"type": "string"}, {"type": "null"}],
        }
        result = flatten_nullable_anyof_openai(node)
        assert result["type"] == ["string", "null"]

    def test_object_nullable_kept(self):
        node = {
            "anyOf": [
                {"type": "object", "properties": {"x": {"type": "integer"}}},
                {"type": "null"},
            ],
        }
        result = flatten_nullable_anyof_openai(node)
        assert "anyOf" in result  # kept as-is for object types

    def test_array_nullable_kept(self):
        node = {
            "anyOf": [
                {"type": "array", "items": {"type": "string"}},
                {"type": "null"},
            ],
        }
        result = flatten_nullable_anyof_openai(node)
        assert "anyOf" in result

    def test_no_type_kept(self):
        """When real variant has no type key, keep anyOf."""
        node = {
            "anyOf": [{"properties": {"a": {"type": "string"}}}, {"type": "null"}],
        }
        result = flatten_nullable_anyof_openai(node)
        assert "anyOf" in result

    def test_non_nullable_passthrough(self):
        node = {"type": "integer"}
        result = flatten_nullable_anyof_openai(node)
        assert result == {"type": "integer"}

    def test_primitive_with_description(self):
        node = {
            "anyOf": [{"type": "number"}, {"type": "null"}],
            "description": "price",
        }
        result = flatten_nullable_anyof_openai(node)
        assert result["type"] == ["number", "null"]
        assert result["description"] == "price"

    def test_three_variants_passthrough(self):
        node = {
            "anyOf": [{"type": "string"}, {"type": "integer"}, {"type": "null"}],
        }
        result = flatten_nullable_anyof_openai(node)
        assert "anyOf" in result
