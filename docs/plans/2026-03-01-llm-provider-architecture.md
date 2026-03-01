# LLM Provider Architecture Refactor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor monolithic `llm.py` (1328 LOC) into a Strategy Pattern with per-provider implementations so each LLM provider (Anthropic, OpenAI, Google, Generic) gets optimal schema formatting, message construction, thinking config, and response parsing.

**Architecture:** Extract provider-specific logic from `LLMClient` into a `BaseProvider` ABC with concrete implementations (`AnthropicProvider`, `OpenAIProvider`, `GoogleProvider`, `GenericProvider`). `LLMClient` delegates to the appropriate provider via a registry function `get_provider(model_id)`. Shared HTTP/retry/streaming logic stays in `LLMClient`.

**Tech Stack:** Python 3.12+, Pydantic v2, httpx, asyncio, pytest

---

## Current State

`backend/app/services/llm.py` contains:
- **Provider detection:** `_detect_provider()` (lines 191-214)
- **Schema cleaners:** `_clean_schema_for_anthropic` (272-295), `_clean_schema_for_google` (350-415), `_clean_schema_for_openai` (418-459), `_clean_schema_generic` (462-511), `_prepare_schema` dispatcher (514-524)
- **Schema hint:** `_compact_schema_hint()` (527-551) — only top-level fields for Anthropic
- **Ref resolution:** `_resolve_refs()` (217-269), `_flatten_nullable_anyof()` (298-318), `_flatten_nullable_anyof_openai()` (321-347)
- **LLMClient class** (554-1328): `_build_body`, `complete_structured`, `complete_structured_streaming`, `_retry_with_correction`, `complete_text`, `complete_streaming`, `list_models`, `list_all_models`, `close`
- **Provider branching** duplicated in `complete_structured` (698-734) and `complete_structured_streaming` (846-882)

**Call sites:**
- `extraction.py` → `complete_structured_streaming` (ExtractionResult schema)
- `aggregation.py` → `complete_structured_streaming` (AggregatedReport schema)
- `evaluator.py` → `complete_structured_streaming` (QAEvaluation schema)
- `chat.py` → `complete_streaming` (plain text)
- `pipeline.py` → orchestrates all, creates LLMClient instances

**Key problems to fix:**
1. Anthropic uses `json_object` mode with compact hint instead of `json_schema` structured output
2. `_compact_schema_hint()` only shows top-level fields — ExtractionResult has 20+ nested models
3. Thinking + temperature conflict (Anthropic requires temp=1.0 when thinking enabled)
4. Duplicated provider branching in structured and streaming methods
5. No native PDF support for Anthropic (base64 document blocks)

---

## New File Structure

```
backend/app/services/
├── llm.py                    # LLMClient (slim: HTTP, retry, streaming)
├── providers/
│   ├── __init__.py           # get_provider(), re-exports
│   ├── base.py               # BaseProvider ABC
│   ├── anthropic.py          # AnthropicProvider
│   ├── openai.py             # OpenAIProvider
│   ├── google.py             # GoogleProvider
│   └── generic.py            # GenericProvider
└── schema_utils.py           # Shared: _resolve_refs, _flatten_nullable_anyof, _extract_json
```

---

### Task 1: Create shared schema utilities module

**Files:**
- Create: `backend/app/services/schema_utils.py`
- Test: `backend/tests/test_schema_utils.py`

**Step 1: Write failing test**

```python
# backend/tests/test_schema_utils.py
import pytest
from app.services.schema_utils import resolve_refs, flatten_nullable_anyof, extract_json

class TestResolveRefs:
    def test_inlines_simple_ref(self):
        schema = {
            "type": "object",
            "properties": {"item": {"$ref": "#/$defs/Item"}},
            "$defs": {"Item": {"type": "object", "properties": {"name": {"type": "string"}}}},
        }
        result = resolve_refs(schema)
        assert "$ref" not in str(result)
        assert result["properties"]["item"]["type"] == "object"

    def test_handles_circular_ref(self):
        schema = {
            "type": "object",
            "properties": {"parent": {"$ref": "#/$defs/Node"}},
            "$defs": {"Node": {"type": "object", "properties": {"child": {"$ref": "#/$defs/Node"}}}},
        }
        result = resolve_refs(schema)
        assert "$ref" not in str(result)

    def test_no_defs_passthrough(self):
        schema = {"type": "string"}
        result = resolve_refs(schema)
        assert result == {"type": "string"}

class TestFlattenNullableAnyof:
    def test_flattens_nullable(self):
        node = {"anyOf": [{"type": "string"}, {"type": "null"}]}
        result = flatten_nullable_anyof(node)
        assert result == {"type": "string"}

    def test_preserves_non_nullable(self):
        node = {"type": "string"}
        result = flatten_nullable_anyof(node)
        assert result == {"type": "string"}

class TestExtractJson:
    def test_extracts_from_markdown_fence(self):
        text = '```json\n{"key": "value"}\n```'
        assert extract_json(text) == '{"key": "value"}'

    def test_extracts_raw_json(self):
        text = '{"key": "value"}'
        assert extract_json(text) == '{"key": "value"}'
```

**Step 2: Run test to verify it fails**

Run: `cd C:/Users/nj/projects/foxdoc/.worktrees/llm-provider-refactor && uv run pytest backend/tests/test_schema_utils.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.schema_utils'`

**Step 3: Write implementation**

Extract from `llm.py` lines 137-269 and 298-347 into `schema_utils.py`:

```python
# backend/app/services/schema_utils.py
# Shared JSON schema utilities for LLM provider implementations
# Handles ref resolution, nullable flattening, and JSON extraction
# Related: providers/base.py, llm.py

import json
import logging
import re

logger = logging.getLogger(__name__)


def resolve_refs(schema: dict) -> dict:
    """Inline all $defs/$ref references so the schema is self-contained."""
    # Copy existing _resolve_refs logic from llm.py:217-269
    defs = schema.pop("$defs", None) or schema.pop("definitions", None) or {}
    if not defs:
        return schema

    def _inline(node: dict, resolving: frozenset[str] = frozenset()) -> dict:
        if "$ref" in node:
            ref_path = node["$ref"]
            type_name = ref_path.rsplit("/", 1)[-1]
            if type_name in resolving:
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
    """Convert anyOf: [{...type}, {type: null}] to just the real type."""
    if "anyOf" not in node or not isinstance(node["anyOf"], list):
        return node
    variants = node["anyOf"]
    if len(variants) != 2:
        return node
    null_variant = next((v for v in variants if isinstance(v, dict) and v.get("type") == "null"), None)
    real_variant = next((v for v in variants if isinstance(v, dict) and v.get("type") != "null"), None)
    if null_variant is None or real_variant is None:
        return node
    merged = dict(real_variant)
    for k, v in node.items():
        if k != "anyOf":
            merged.setdefault(k, v)
    return merged


def flatten_nullable_anyof_openai(node: dict) -> dict:
    """Convert anyOf nullable to OpenAI strict format: type: [T, "null"]."""
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
    if real_type in ("object", "array") or real_type is None:
        return node
    merged = dict(real_variant)
    for k, v in node.items():
        if k != "anyOf":
            merged.setdefault(k, v)
    merged["type"] = [real_type, "null"]
    return merged


def extract_json(text: str) -> str:
    """Extract JSON from text that may include markdown fences or surrounding text."""
    # Copy existing _extract_json logic from llm.py:137-188
    text = text.strip()
    fence_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if fence_match:
        return fence_match.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start:end + 1]
    return text
```

**Step 4: Run test to verify it passes**

Run: `cd C:/Users/nj/projects/foxdoc/.worktrees/llm-provider-refactor && uv run pytest backend/tests/test_schema_utils.py -v`
Expected: PASS

**Step 5: Commit**

```bash
cd C:/Users/nj/projects/foxdoc/.worktrees/llm-provider-refactor
git add backend/app/services/schema_utils.py backend/tests/test_schema_utils.py
git commit -m "refactor: extract shared schema utilities into schema_utils.py"
```

---

### Task 2: Create BaseProvider ABC

**Files:**
- Create: `backend/app/services/providers/__init__.py`
- Create: `backend/app/services/providers/base.py`
- Test: `backend/tests/test_providers_base.py`

**Step 1: Write failing test**

```python
# backend/tests/test_providers_base.py
import pytest
from app.services.providers.base import BaseProvider

def test_base_provider_is_abstract():
    with pytest.raises(TypeError):
        BaseProvider()

def test_base_provider_has_required_methods():
    methods = [
        "prepare_schema",
        "build_response_format",
        "build_messages",
        "build_thinking_config",
        "get_temperature",
        "supports_native_pdf",
    ]
    for method in methods:
        assert hasattr(BaseProvider, method), f"Missing method: {method}"
```

**Step 2: Run test to verify it fails**

Run: `cd C:/Users/nj/projects/foxdoc/.worktrees/llm-provider-refactor && uv run pytest backend/tests/test_providers_base.py -v`
Expected: FAIL

**Step 3: Write implementation**

```python
# backend/app/services/providers/__init__.py
# LLM provider strategy implementations
# Registry for provider-specific schema, message, and config formatting
# Related: base.py, llm.py

from app.services.providers.base import BaseProvider
from app.services.providers.registry import get_provider

__all__ = ["BaseProvider", "get_provider"]
```

```python
# backend/app/services/providers/base.py
# Abstract base class for LLM provider strategies
# Defines the interface that each provider must implement
# Related: anthropic.py, openai.py, google.py, generic.py

from abc import ABC, abstractmethod
from pydantic import BaseModel


class BaseProvider(ABC):
    """Strategy interface for LLM provider-specific behavior."""

    @abstractmethod
    def prepare_schema(self, raw_schema: dict) -> dict:
        """Clean and format JSON schema for this provider's requirements."""
        ...

    @abstractmethod
    def build_response_format(
        self, cleaned_schema: dict, schema_name: str
    ) -> dict:
        """Build the response_format parameter for the API request."""
        ...

    @abstractmethod
    def build_messages(
        self, system: str, user: str | list[dict]
    ) -> list[dict]:
        """Build the messages array with provider-specific formatting."""
        ...

    @abstractmethod
    def build_thinking_config(self, thinking: str) -> dict | None:
        """Build thinking/reasoning config. Returns None if thinking disabled."""
        ...

    @abstractmethod
    def get_temperature(
        self, requested_temp: float, thinking: str
    ) -> float | None:
        """Return the temperature to use, considering thinking constraints."""
        ...

    @abstractmethod
    def supports_native_pdf(self) -> bool:
        """Whether this provider supports native PDF input (base64 document blocks)."""
        ...
```

**Step 4: Run test to verify it passes**

Run: `cd C:/Users/nj/projects/foxdoc/.worktrees/llm-provider-refactor && uv run pytest backend/tests/test_providers_base.py -v`
Expected: PASS

**Step 5: Commit**

```bash
cd C:/Users/nj/projects/foxdoc/.worktrees/llm-provider-refactor
git add backend/app/services/providers/
git add backend/tests/test_providers_base.py
git commit -m "refactor: add BaseProvider ABC for LLM provider strategy pattern"
```

---

### Task 3: Implement AnthropicProvider

**Files:**
- Create: `backend/app/services/providers/anthropic.py`
- Test: `backend/tests/test_provider_anthropic.py`

**Step 1: Write failing tests**

```python
# backend/tests/test_provider_anthropic.py
import pytest
from app.services.providers.anthropic import AnthropicProvider

@pytest.fixture
def provider():
    return AnthropicProvider()

class TestPrepareSchema:
    def test_removes_title_description_default(self, provider):
        schema = {"type": "object", "title": "Foo", "description": "bar", "default": {}, "properties": {"x": {"type": "string", "title": "X"}}}
        result = provider.prepare_schema(schema)
        assert "title" not in result
        assert "description" not in result
        assert "default" not in result
        assert "title" not in result["properties"]["x"]

    def test_adds_additional_properties_false(self, provider):
        schema = {"type": "object", "properties": {"x": {"type": "string"}}}
        result = provider.prepare_schema(schema)
        assert result["additionalProperties"] is False

    def test_resolves_refs(self, provider):
        schema = {
            "type": "object",
            "properties": {"item": {"$ref": "#/$defs/Item"}},
            "$defs": {"Item": {"type": "object", "properties": {"n": {"type": "string"}}}},
        }
        result = provider.prepare_schema(schema)
        assert "$ref" not in str(result)

class TestBuildResponseFormat:
    def test_uses_json_schema_with_strict(self, provider):
        schema = {"type": "object", "properties": {"x": {"type": "string"}}}
        result = provider.build_response_format(schema, "TestSchema")
        assert result["type"] == "json_schema"
        assert result["json_schema"]["name"] == "TestSchema"
        assert result["json_schema"]["schema"] == schema

class TestBuildMessages:
    def test_adds_cache_control_to_system(self, provider):
        messages = provider.build_messages("System prompt", "User input")
        system_msg = messages[0]
        assert system_msg["role"] == "system"
        assert isinstance(system_msg["content"], list)
        assert system_msg["content"][0]["cache_control"] == {"type": "ephemeral"}

    def test_user_can_be_list(self, provider):
        user_parts = [{"type": "text", "text": "hello"}]
        messages = provider.build_messages("System", user_parts)
        assert messages[1]["content"] == user_parts

class TestThinkingConfig:
    def test_off_returns_none(self, provider):
        assert provider.build_thinking_config("off") is None

    def test_low_returns_budget(self, provider):
        result = provider.build_thinking_config("low")
        assert result is not None
        assert result["type"] == "enabled"
        assert result["budget_tokens"] == 2000

class TestGetTemperature:
    def test_forces_1_when_thinking_enabled(self, provider):
        assert provider.get_temperature(0.1, "high") == 1.0

    def test_uses_requested_when_thinking_off(self, provider):
        assert provider.get_temperature(0.1, "off") == 0.1

class TestNativePdf:
    def test_supports_native_pdf(self, provider):
        assert provider.supports_native_pdf() is True
```

**Step 2: Run test to verify it fails**

Run: `cd C:/Users/nj/projects/foxdoc/.worktrees/llm-provider-refactor && uv run pytest backend/tests/test_provider_anthropic.py -v`
Expected: FAIL

**Step 3: Write implementation**

```python
# backend/app/services/providers/anthropic.py
# Anthropic Claude provider strategy
# Handles schema cleaning, cache_control messages, thinking config, temp=1.0 rule
# Related: base.py, schema_utils.py

import logging
from app.services.providers.base import BaseProvider
from app.services.schema_utils import resolve_refs, flatten_nullable_anyof

logger = logging.getLogger(__name__)

THINKING_BUDGETS = {
    "off": 0,
    "low": 2000,
    "medium": 5000,
    "high": 10000,
}


class AnthropicProvider(BaseProvider):

    def prepare_schema(self, raw_schema: dict) -> dict:
        schema = resolve_refs(dict(raw_schema))
        return self._clean(schema)

    def _clean(self, node: dict) -> dict:
        cleaned: dict = {}
        for key, value in node.items():
            if key in ("title", "description", "default"):
                continue
            if isinstance(value, dict):
                cleaned[key] = self._clean(value)
            elif isinstance(value, list):
                cleaned[key] = [
                    self._clean(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                cleaned[key] = value
        if cleaned.get("type") == "object" and "additionalProperties" not in cleaned:
            cleaned["additionalProperties"] = False
        return cleaned

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
        budget = THINKING_BUDGETS.get(thinking, 0)
        if budget <= 0:
            return None
        return {"type": "enabled", "budget_tokens": budget}

    def get_temperature(self, requested_temp: float, thinking: str) -> float | None:
        if thinking != "off":
            return 1.0
        return requested_temp

    def supports_native_pdf(self) -> bool:
        return True
```

**Step 4: Run test to verify it passes**

Run: `cd C:/Users/nj/projects/foxdoc/.worktrees/llm-provider-refactor && uv run pytest backend/tests/test_provider_anthropic.py -v`
Expected: PASS

**Step 5: Commit**

```bash
cd C:/Users/nj/projects/foxdoc/.worktrees/llm-provider-refactor
git add backend/app/services/providers/anthropic.py backend/tests/test_provider_anthropic.py
git commit -m "feat: add AnthropicProvider with json_schema, cache_control, thinking"
```

---

### Task 4: Implement OpenAIProvider

**Files:**
- Create: `backend/app/services/providers/openai.py`
- Test: `backend/tests/test_provider_openai.py`

**Step 1: Write failing tests**

```python
# backend/tests/test_provider_openai.py
import pytest
from app.services.providers.openai import OpenAIProvider

@pytest.fixture
def provider():
    return OpenAIProvider()

class TestPrepareSchema:
    def test_removes_title_default_keeps_description(self, provider):
        schema = {"type": "object", "title": "Foo", "description": "bar", "default": {}, "properties": {"x": {"type": "string", "description": "field x"}}}
        result = provider.prepare_schema(schema)
        assert "title" not in result
        assert "default" not in result
        assert result.get("description") == "bar"

    def test_all_properties_required(self, provider):
        schema = {"type": "object", "properties": {"a": {"type": "string"}, "b": {"type": "integer"}}}
        result = provider.prepare_schema(schema)
        assert set(result["required"]) == {"a", "b"}

    def test_flattens_nullable_to_type_array(self, provider):
        schema = {"type": "object", "properties": {"x": {"anyOf": [{"type": "string"}, {"type": "null"}]}}}
        result = provider.prepare_schema(schema)
        assert result["properties"]["x"]["type"] == ["string", "null"]

class TestBuildResponseFormat:
    def test_uses_json_schema(self, provider):
        schema = {"type": "object"}
        result = provider.build_response_format(schema, "TestSchema")
        assert result["type"] == "json_schema"
        assert result["json_schema"]["name"] == "TestSchema"

class TestBuildMessages:
    def test_standard_messages(self, provider):
        messages = provider.build_messages("System", "User")
        assert messages[0] == {"role": "system", "content": "System"}
        assert messages[1] == {"role": "user", "content": "User"}

class TestThinkingConfig:
    def test_off_returns_none(self, provider):
        assert provider.build_thinking_config("off") is None

    def test_has_thinking_budgets(self, provider):
        result = provider.build_thinking_config("high")
        assert result is not None

class TestGetTemperature:
    def test_uses_requested_temperature(self, provider):
        assert provider.get_temperature(0.1, "off") == 0.1
        assert provider.get_temperature(0.5, "high") == 0.5

class TestNativePdf:
    def test_no_native_pdf(self, provider):
        assert provider.supports_native_pdf() is False
```

**Step 2: Run test, verify fails**

**Step 3: Write implementation**

```python
# backend/app/services/providers/openai.py
# OpenAI GPT provider strategy
# Handles strict mode schema (all props required), nullable flattening, standard messages
# Related: base.py, schema_utils.py

import logging
from app.services.providers.base import BaseProvider
from app.services.schema_utils import resolve_refs, flatten_nullable_anyof_openai

logger = logging.getLogger(__name__)

THINKING_BUDGETS = {"off": 0, "low": 2000, "medium": 5000, "high": 10000}


class OpenAIProvider(BaseProvider):

    def prepare_schema(self, raw_schema: dict) -> dict:
        schema = resolve_refs(dict(raw_schema))
        return self._clean(schema)

    def _clean(self, node: dict) -> dict:
        node = flatten_nullable_anyof_openai(node)
        cleaned: dict = {}
        for key, value in node.items():
            if key in ("title", "default"):
                continue
            if isinstance(value, dict):
                cleaned[key] = self._clean(value)
            elif isinstance(value, list):
                cleaned[key] = [self._clean(item) if isinstance(item, dict) else item for item in value]
            else:
                cleaned[key] = value
        if cleaned.get("type") == "object":
            if "additionalProperties" not in cleaned:
                cleaned["additionalProperties"] = False
            if "properties" in cleaned:
                cleaned["required"] = list(cleaned["properties"].keys())
        return cleaned

    def build_response_format(self, cleaned_schema: dict, schema_name: str) -> dict:
        return {
            "type": "json_schema",
            "json_schema": {"name": schema_name, "schema": cleaned_schema},
        }

    def build_messages(self, system: str, user: str | list[dict]) -> list[dict]:
        return [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

    def build_thinking_config(self, thinking: str) -> dict | None:
        budget = THINKING_BUDGETS.get(thinking, 0)
        if budget <= 0:
            return None
        return {"type": "enabled", "budget_tokens": budget}

    def get_temperature(self, requested_temp: float, thinking: str) -> float | None:
        return requested_temp

    def supports_native_pdf(self) -> bool:
        return False
```

**Step 4: Run tests, verify passes**

**Step 5: Commit**

```bash
git add backend/app/services/providers/openai.py backend/tests/test_provider_openai.py
git commit -m "feat: add OpenAIProvider with strict mode schema, nullable flattening"
```

---

### Task 5: Implement GoogleProvider

**Files:**
- Create: `backend/app/services/providers/google.py`
- Test: `backend/tests/test_provider_google.py`

**Step 1: Write failing tests**

```python
# backend/tests/test_provider_google.py
import pytest
from app.services.providers.google import GoogleProvider

@pytest.fixture
def provider():
    return GoogleProvider()

class TestPrepareSchema:
    def test_keeps_description_adds_fallback(self, provider):
        schema = {"type": "object", "properties": {"x": {"type": "string"}}}
        result = provider.prepare_schema(schema)
        assert "description" in result["properties"]["x"]

    def test_removes_title_default(self, provider):
        schema = {"type": "object", "title": "Foo", "default": {}, "properties": {}}
        result = provider.prepare_schema(schema)
        assert "title" not in result
        assert "default" not in result

    def test_adds_required_array(self, provider):
        schema = {"type": "object", "properties": {"a": {"type": "string"}, "b": {"type": "integer"}}}
        result = provider.prepare_schema(schema)
        assert set(result["required"]) == {"a", "b"}

    def test_flattens_nullable_anyof(self, provider):
        schema = {"type": "object", "properties": {"x": {"anyOf": [{"type": "string"}, {"type": "null"}]}}}
        result = provider.prepare_schema(schema)
        assert "anyOf" not in str(result["properties"]["x"])

class TestBuildResponseFormat:
    def test_uses_json_schema(self, provider):
        schema = {"type": "object"}
        result = provider.build_response_format(schema, "TestSchema")
        assert result["type"] == "json_schema"

class TestBuildMessages:
    def test_standard_messages(self, provider):
        messages = provider.build_messages("System", "User")
        assert len(messages) == 2

class TestNativePdf:
    def test_no_native_pdf(self, provider):
        assert provider.supports_native_pdf() is False
```

**Step 2: Run test, verify fails**

**Step 3: Write implementation**

Copy existing `_clean_schema_for_google` logic (llm.py:350-415) into `GoogleProvider.prepare_schema`.

```python
# backend/app/services/providers/google.py
# Google Gemini provider strategy
# Handles description requirements, ref inlining, nullable flattening, required arrays
# Related: base.py, schema_utils.py

import logging
from app.services.providers.base import BaseProvider
from app.services.schema_utils import resolve_refs, flatten_nullable_anyof

logger = logging.getLogger(__name__)

THINKING_BUDGETS = {"off": 0, "low": 2000, "medium": 5000, "high": 10000}


class GoogleProvider(BaseProvider):

    def prepare_schema(self, raw_schema: dict) -> dict:
        schema = resolve_refs(dict(raw_schema))
        return self._clean(schema)

    def _clean(self, node: dict, field_name: str = "") -> dict:
        node = flatten_nullable_anyof(node)
        cleaned: dict = {}
        for key, value in node.items():
            if key in ("title", "default"):
                continue
            if key == "properties" and isinstance(value, dict):
                cleaned_props: dict = {}
                for prop_name, prop_val in value.items():
                    if isinstance(prop_val, dict):
                        cleaned_prop = self._clean(prop_val, field_name=prop_name)
                        if "description" not in cleaned_prop:
                            cleaned_prop["description"] = prop_name.replace("_", " ")
                        cleaned_props[prop_name] = cleaned_prop
                    else:
                        cleaned_props[prop_name] = prop_val
                cleaned[key] = cleaned_props
            elif isinstance(value, dict):
                cleaned[key] = self._clean(value, field_name=field_name)
            elif isinstance(value, list):
                cleaned[key] = [self._clean(item, field_name=field_name) if isinstance(item, dict) else item for item in value]
            else:
                cleaned[key] = value

        if cleaned.get("type") == "object":
            if "additionalProperties" not in cleaned:
                cleaned["additionalProperties"] = False
            if "properties" in cleaned and "required" not in cleaned:
                cleaned["required"] = list(cleaned["properties"].keys())

        if cleaned.get("type") == "array" and "items" in cleaned:
            items = cleaned["items"]
            if isinstance(items, dict):
                if "description" not in items:
                    items["description"] = f"{field_name} item" if field_name else "array item"
                if items.get("type") == "object" and "properties" in items and "required" not in items:
                    items["required"] = list(items["properties"].keys())

        if field_name and "description" not in cleaned and cleaned.get("type") not in (None,):
            cleaned["description"] = field_name.replace("_", " ")

        return cleaned

    def build_response_format(self, cleaned_schema: dict, schema_name: str) -> dict:
        return {
            "type": "json_schema",
            "json_schema": {"name": schema_name, "schema": cleaned_schema},
        }

    def build_messages(self, system: str, user: str | list[dict]) -> list[dict]:
        return [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

    def build_thinking_config(self, thinking: str) -> dict | None:
        budget = THINKING_BUDGETS.get(thinking, 0)
        if budget <= 0:
            return None
        return {"type": "enabled", "budget_tokens": budget}

    def get_temperature(self, requested_temp: float, thinking: str) -> float | None:
        return requested_temp

    def supports_native_pdf(self) -> bool:
        return False
```

**Step 4: Run tests, verify passes**

**Step 5: Commit**

```bash
git add backend/app/services/providers/google.py backend/tests/test_provider_google.py
git commit -m "feat: add GoogleProvider with description fallbacks, required arrays"
```

---

### Task 6: Implement GenericProvider + Provider Registry

**Files:**
- Create: `backend/app/services/providers/generic.py`
- Create: `backend/app/services/providers/registry.py`
- Test: `backend/tests/test_provider_registry.py`

**Step 1: Write failing tests**

```python
# backend/tests/test_provider_registry.py
import pytest
from app.services.providers.registry import get_provider
from app.services.providers.anthropic import AnthropicProvider
from app.services.providers.openai import OpenAIProvider
from app.services.providers.google import GoogleProvider
from app.services.providers.generic import GenericProvider

class TestGetProvider:
    def test_anthropic_models(self):
        assert isinstance(get_provider("anthropic/claude-sonnet-4.6"), AnthropicProvider)
        assert isinstance(get_provider("anthropic/claude-opus-4"), AnthropicProvider)

    def test_openai_models(self):
        assert isinstance(get_provider("openai/gpt-5.1-codex-mini"), OpenAIProvider)

    def test_google_models(self):
        assert isinstance(get_provider("google/gemini-3.1-pro-preview"), GoogleProvider)

    def test_unknown_models(self):
        assert isinstance(get_provider("meta-llama/llama-3.3-70b"), GenericProvider)
        assert isinstance(get_provider("deepseek/deepseek-v3"), GenericProvider)

    def test_caches_instances(self):
        p1 = get_provider("anthropic/claude-sonnet-4.6")
        p2 = get_provider("anthropic/claude-opus-4")
        assert p1 is p2  # Same provider type, same instance
```

**Step 2: Run test, verify fails**

**Step 3: Write implementation**

```python
# backend/app/services/providers/generic.py
# Generic/fallback provider strategy for unknown LLM providers
# Uses strictest common denominator: all props required, inline refs, nullable flattening
# Related: base.py, schema_utils.py

import logging
from app.services.providers.base import BaseProvider
from app.services.schema_utils import resolve_refs, flatten_nullable_anyof_openai

logger = logging.getLogger(__name__)

THINKING_BUDGETS = {"off": 0, "low": 2000, "medium": 5000, "high": 10000}


class GenericProvider(BaseProvider):

    def prepare_schema(self, raw_schema: dict) -> dict:
        schema = resolve_refs(dict(raw_schema))
        return self._clean(schema)

    def _clean(self, node: dict, field_name: str = "") -> dict:
        node = flatten_nullable_anyof_openai(node)
        cleaned: dict = {}
        for key, value in node.items():
            if key in ("title", "default"):
                continue
            if key == "properties" and isinstance(value, dict):
                cleaned_props: dict = {}
                for prop_name, prop_val in value.items():
                    if isinstance(prop_val, dict):
                        cleaned_prop = self._clean(prop_val, field_name=prop_name)
                        if "description" not in cleaned_prop:
                            cleaned_prop["description"] = prop_name.replace("_", " ")
                        cleaned_props[prop_name] = cleaned_prop
                    else:
                        cleaned_props[prop_name] = prop_val
                cleaned[key] = cleaned_props
            elif isinstance(value, dict):
                cleaned[key] = self._clean(value, field_name=field_name)
            elif isinstance(value, list):
                cleaned[key] = [self._clean(item, field_name=field_name) if isinstance(item, dict) else item for item in value]
            else:
                cleaned[key] = value
        if cleaned.get("type") == "object":
            if "additionalProperties" not in cleaned:
                cleaned["additionalProperties"] = False
            if "properties" in cleaned:
                cleaned["required"] = list(cleaned["properties"].keys())
        return cleaned

    def build_response_format(self, cleaned_schema: dict, schema_name: str) -> dict:
        return {
            "type": "json_schema",
            "json_schema": {"name": schema_name, "schema": cleaned_schema},
        }

    def build_messages(self, system: str, user: str | list[dict]) -> list[dict]:
        return [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

    def build_thinking_config(self, thinking: str) -> dict | None:
        budget = THINKING_BUDGETS.get(thinking, 0)
        if budget <= 0:
            return None
        return {"type": "enabled", "budget_tokens": budget}

    def get_temperature(self, requested_temp: float, thinking: str) -> float | None:
        return requested_temp

    def supports_native_pdf(self) -> bool:
        return False
```

```python
# backend/app/services/providers/registry.py
# Provider registry — maps model IDs to provider instances
# Singleton pattern: one instance per provider type
# Related: base.py, anthropic.py, openai.py, google.py, generic.py

from app.services.providers.anthropic import AnthropicProvider
from app.services.providers.openai import OpenAIProvider
from app.services.providers.google import GoogleProvider
from app.services.providers.generic import GenericProvider
from app.services.providers.base import BaseProvider

_instances: dict[str, BaseProvider] = {}


def get_provider(model_id: str) -> BaseProvider:
    """Return the appropriate provider instance for a model ID."""
    provider_key = _detect_provider_key(model_id)
    if provider_key not in _instances:
        _instances[provider_key] = _create_provider(provider_key)
    return _instances[provider_key]


def _detect_provider_key(model_id: str) -> str:
    prefixes = {
        "anthropic/": "anthropic",
        "google/": "google",
        "openai/": "openai",
    }
    for prefix, key in prefixes.items():
        if model_id.startswith(prefix):
            return key
    return "generic"


def _create_provider(key: str) -> BaseProvider:
    providers = {
        "anthropic": AnthropicProvider,
        "openai": OpenAIProvider,
        "google": GoogleProvider,
        "generic": GenericProvider,
    }
    return providers[key]()
```

**Step 4: Run tests, verify passes**

**Step 5: Commit**

```bash
git add backend/app/services/providers/generic.py backend/app/services/providers/registry.py backend/tests/test_provider_registry.py
git commit -m "feat: add GenericProvider and provider registry with singleton caching"
```

---

### Task 7: Refactor LLMClient to use providers

This is the critical task. Refactor `complete_structured`, `complete_structured_streaming`, and `_build_body` to delegate to provider instances.

**Files:**
- Modify: `backend/app/services/llm.py`
- Modify: `backend/tests/test_llm.py`

**Step 1: Write failing test for new delegation**

```python
# Add to backend/tests/test_llm.py
class TestProviderDelegation:
    """Verify LLMClient delegates to provider instances."""

    @pytest.mark.asyncio
    async def test_anthropic_uses_json_schema(self, llm_client, mock_response):
        """Anthropic should now use json_schema, not json_object."""
        mock_response({"choices": [{"message": {"content": '{"field": "value"}'}}], "usage": {"prompt_tokens": 10, "completion_tokens": 20}})

        from pydantic import BaseModel
        class SimpleSchema(BaseModel):
            field: str

        result, usage = await llm_client.complete_structured(
            system="test", user="test",
            response_schema=SimpleSchema,
            model="anthropic/claude-sonnet-4.6",
        )
        # Verify the request body used json_schema, not json_object
        # (check via mock inspection)
```

**Step 2: Run test, verify fails (still uses json_object for Anthropic)**

**Step 3: Refactor LLMClient**

Key changes in `llm.py`:

1. Import `get_provider` from `providers`
2. Remove all `_clean_schema_*` functions, `_prepare_schema`, `_compact_schema_hint`, `_detect_provider`, `_resolve_refs`, `_flatten_nullable_anyof*` — they now live in providers and schema_utils
3. Keep: `LLMClient`, `_build_thinking` (used by `_build_body`), `_extract_usage`, `_extract_json` (delegated to schema_utils), exceptions, `build_multimodal_content`, constants
4. Refactor `complete_structured` and `complete_structured_streaming`:

```python
# In complete_structured — replace lines 693-734 with:
provider = get_provider(resolved_model)
cleaned_schema = provider.prepare_schema(raw_schema)
response_format = provider.build_response_format(cleaned_schema, response_schema.__name__)
messages = provider.build_messages(system, user)
temperature = provider.get_temperature(temperature, thinking)
thinking_config = provider.build_thinking_config(thinking)
```

5. Same pattern for `complete_structured_streaming` (lines 840-882)
6. Update `_build_body` to accept optional `thinking_config` and `temperature` overrides from providers

**Step 4: Run ALL existing tests**

Run: `cd C:/Users/nj/projects/foxdoc/.worktrees/llm-provider-refactor && uv run pytest backend/tests/test_llm.py -v`
Expected: ALL PASS (existing behavior preserved, Anthropic now uses json_schema)

**Step 5: Commit**

```bash
git add backend/app/services/llm.py backend/tests/test_llm.py
git commit -m "refactor: LLMClient delegates to provider strategy pattern

- Removes duplicated provider branching from complete_structured/streaming
- Anthropic now uses json_schema (not json_object with compact hint)
- Temperature forced to 1.0 for Anthropic when thinking enabled
- All provider-specific logic encapsulated in providers/"
```

---

### Task 8: Update imports in call sites

**Files:**
- Modify: `backend/app/services/extraction.py` (if any direct imports from old functions)
- Modify: `backend/app/services/aggregation.py`
- Modify: `backend/app/services/evaluator.py`
- Modify: `backend/app/services/chat.py`
- Modify: `backend/app/services/pipeline.py`

**Step 1: Verify no call site directly uses removed functions**

The call sites only use `LLMClient` and `build_multimodal_content` — both still in `llm.py`. No changes should be needed to call sites unless they import `_detect_provider` or schema functions directly.

Run: `grep -r "_detect_provider\|_prepare_schema\|_clean_schema\|_compact_schema" backend/app/services/ --include="*.py" | grep -v llm.py | grep -v providers/`

**Step 2: If no matches, verify all call sites work**

Run: `cd C:/Users/nj/projects/foxdoc/.worktrees/llm-provider-refactor && uv run pytest backend/tests/ -v`
Expected: ALL PASS

**Step 3: Commit (if any changes needed)**

```bash
git commit -m "refactor: update call site imports after provider extraction"
```

---

### Task 9: Remove dead code from llm.py

**Files:**
- Modify: `backend/app/services/llm.py`

**Step 1: Remove these functions/code blocks from llm.py:**

- `_detect_provider()` (191-214) — now in `providers/registry.py`
- `_resolve_refs()` (217-269) — now in `schema_utils.py`
- `_clean_schema_for_anthropic()` (272-295) — now in `providers/anthropic.py`
- `_flatten_nullable_anyof()` (298-318) — now in `schema_utils.py`
- `_flatten_nullable_anyof_openai()` (321-347) — now in `schema_utils.py`
- `_clean_schema_for_google()` (350-415) — now in `providers/google.py`
- `_clean_schema_for_openai()` (418-459) — now in `providers/openai.py`
- `_clean_schema_generic()` (462-511) — now in `providers/generic.py`
- `_prepare_schema()` (514-524) — now in `providers/registry.py`
- `_compact_schema_hint()` (527-551) — replaced by json_schema structured output

Keep `_extract_json` as a thin wrapper around `schema_utils.extract_json` or import directly.

**Step 2: Run ALL tests**

Run: `cd C:/Users/nj/projects/foxdoc/.worktrees/llm-provider-refactor && uv run pytest backend/tests/ -v`
Expected: ALL PASS

**Step 3: Verify llm.py LOC reduced**

Run: `wc -l backend/app/services/llm.py`
Expected: ~500-600 lines (down from 1328)

**Step 4: Commit**

```bash
git add backend/app/services/llm.py
git commit -m "refactor: remove dead code from llm.py after provider extraction

llm.py reduced from 1328 to ~550 LOC"
```

---

### Task 10: Final integration test and cleanup

**Files:**
- All modified files

**Step 1: Run full test suite**

```bash
cd C:/Users/nj/projects/foxdoc/.worktrees/llm-provider-refactor
uv run pytest backend/tests/ -v
```

**Step 2: Run ruff checks**

```bash
cd C:/Users/nj/projects/foxdoc/.worktrees/llm-provider-refactor
uv run ruff check backend/app/services/providers/ backend/app/services/schema_utils.py backend/app/services/llm.py
uv run ruff format backend/app/services/providers/ backend/app/services/schema_utils.py backend/app/services/llm.py
```

**Step 3: Verify no circular imports**

```bash
cd C:/Users/nj/projects/foxdoc/.worktrees/llm-provider-refactor
python -c "from app.services.llm import LLMClient; from app.services.providers import get_provider; print('OK')"
```

**Step 4: Final commit if any formatting changes**

```bash
git add -A
git commit -m "chore: ruff formatting and final cleanup"
```

---

## Summary

| Task | Description | New Files | Modified |
|------|-------------|-----------|----------|
| 1 | Extract schema_utils.py | schema_utils.py, test_schema_utils.py | — |
| 2 | BaseProvider ABC | providers/__init__.py, providers/base.py, test | — |
| 3 | AnthropicProvider | providers/anthropic.py, test | — |
| 4 | OpenAIProvider | providers/openai.py, test | — |
| 5 | GoogleProvider | providers/google.py, test | — |
| 6 | GenericProvider + Registry | providers/generic.py, providers/registry.py, test | — |
| 7 | Refactor LLMClient | — | llm.py, test_llm.py |
| 8 | Update call site imports | — | extraction/aggregation/evaluator/chat/pipeline |
| 9 | Remove dead code | — | llm.py |
| 10 | Integration test + cleanup | — | all |

**Result:** `llm.py` drops from 1328 → ~550 LOC. Each provider has its own ~80-120 LOC file with focused tests. Adding a new provider = one new file implementing BaseProvider.
