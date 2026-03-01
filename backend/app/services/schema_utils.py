# backend/app/services/schema_utils.py
# Shared JSON-schema utility functions for LLM provider integrations
# Extracted from llm.py so multiple provider backends can reuse them
# Related: llm.py, models/schemas.py

import logging

logger = logging.getLogger(__name__)


def extract_json(raw: str) -> str:
    """
    Robustly extract JSON from LLM output that may contain:
    - Markdown code fences (```json ... ```)
    - Trailing explanatory text after the JSON
    - Leading text before the JSON
    """
    text = raw.strip()

    # Strip markdown code fences
    if text.startswith("```"):
        first_nl = text.index("\n") if "\n" in text else len(text)
        text = text[first_nl + 1:]
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3].rstrip()
        logger.debug("Stripped markdown code fences from structured output")

    # Find the JSON object: first { to its matching }
    start = text.find("{")
    if start == -1:
        return text  # no object found, return as-is and let validation handle it

    depth = 0
    in_string = False
    escape = False
    end = start

    for i in range(start, len(text)):
        c = text[i]
        if escape:
            escape = False
            continue
        if c == "\\":
            escape = True
            continue
        if c == '"' and not escape:
            in_string = not in_string
            continue
        if in_string:
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                end = i
                break

    result = text[start:end + 1]
    if result != text.strip():
        logger.debug("Extracted JSON object (%d chars) from larger output (%d chars)", len(result), len(text))
    return result


def resolve_refs(schema: dict) -> dict:
    """Inline all $defs/$ref references so the schema is self-contained.

    Gemini and some other providers don't support $ref/$defs in JSON schema.
    This replaces every {"$ref": "#/$defs/TypeName"} with the actual definition.
    Handles circular references by tracking the resolution stack.
    """
    defs = schema.pop("$defs", None) or schema.pop("definitions", None) or {}
    if not defs:
        return schema

    def _inline(node: dict, resolving: frozenset[str] = frozenset()) -> dict:
        if "$ref" in node:
            ref_path = node["$ref"]  # e.g. "#/$defs/LotInfo"
            type_name = ref_path.rsplit("/", 1)[-1]
            if type_name in resolving:
                # Circular reference — break the cycle with a generic object
                logger.debug("Circular $ref detected for %s, using generic object", type_name)
                fallback: dict = {"type": "object"}
                for k, v in node.items():
                    if k != "$ref":
                        fallback[k] = v
                return fallback
            if type_name in defs:
                resolved = _inline(dict(defs[type_name]), resolving | {type_name})
                for k, v in node.items():
                    if k != "$ref":
                        resolved.setdefault(k, v)
                return resolved
            return node

        # Flatten single-element allOf (Pydantic sometimes wraps inherited models)
        if "allOf" in node and isinstance(node["allOf"], list) and len(node["allOf"]) == 1:
            merged = dict(node["allOf"][0])
            for k, v in node.items():
                if k != "allOf":
                    merged.setdefault(k, v)
            return _inline(merged, resolving)

        result: dict = {}
        for key, value in node.items():
            if isinstance(value, dict):
                result[key] = _inline(value, resolving)
            elif isinstance(value, list):
                result[key] = [
                    _inline(item, resolving) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                result[key] = value
        return result

    return _inline(schema)


def flatten_nullable_anyof(node: dict) -> dict:
    """Convert anyOf nullable pattern to simpler nullable form.

    Pydantic generates: anyOf: [{...real_type}, {type: null}]
    Many providers prefer: {...real_type} (with the field being Optional in required).
    """
    if "anyOf" not in node or not isinstance(node["anyOf"], list):
        return node
    variants = node["anyOf"]
    if len(variants) != 2:
        return node
    null_variant = next((v for v in variants if isinstance(v, dict) and v.get("type") == "null"), None)
    real_variant = next((v for v in variants if isinstance(v, dict) and v.get("type") != "null"), None)
    if null_variant is None or real_variant is None:
        return node
    # Merge: take real variant + any sibling keys from parent (e.g. description)
    merged = dict(real_variant)
    for k, v in node.items():
        if k != "anyOf":
            merged.setdefault(k, v)
    return merged


def flatten_nullable_anyof_openai(node: dict) -> dict:
    """Convert anyOf nullable pattern to OpenAI strict-mode format.

    Primitive types: anyOf: [{type: "number"}, {type: "null"}] -> {type: ["number", "null"]}
    Object/array types: keep anyOf as-is (OpenAI supports anyOf for complex types).
    See: https://platform.openai.com/docs/guides/structured-outputs
    """
    if "anyOf" not in node or not isinstance(node["anyOf"], list):
        return node
    variants = node["anyOf"]
    if len(variants) != 2:
        return node
    null_variant = next((v for v in variants if isinstance(v, dict) and v.get("type") == "null"), None)
    real_variant = next((v for v in variants if isinstance(v, dict) and v.get("type") != "null"), None)
    if null_variant is None or real_variant is None:
        return node
    real_type = real_variant.get("type")
    # Object/array types: keep anyOf format (OpenAI supports anyOf for nested schemas)
    if real_type in ("object", "array") or real_type is None:
        return node
    # Primitive types: flatten to type: [T, "null"]
    merged = dict(real_variant)
    for k, v in node.items():
        if k != "anyOf":
            merged.setdefault(k, v)
    merged["type"] = [real_type, "null"]
    return merged
