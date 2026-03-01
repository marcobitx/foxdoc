# backend/tests/test_llm.py
# Tests for the OpenRouter LLM client with mocked httpx responses.
# Covers structured completion, text completion, retries, streaming, model listing.

import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from pydantic import BaseModel

from app.services.llm import (
    LLMClient,
    LLMError,
    LLMParseError,
    LLMRateLimitError,
    _build_thinking,
    _extract_usage,
)
from app.services.providers.anthropic import AnthropicProvider


# ── Test helpers ────────────────────────────────────────────────────────────────


class SimpleSchema(BaseModel):
    """Minimal schema for testing structured output."""
    name: str
    score: float


def _make_response(
    status_code: int = 200,
    json_body: dict | None = None,
    text: str = "",
) -> httpx.Response:
    """Create a mock httpx.Response."""
    if json_body is not None:
        content = json.dumps(json_body).encode()
        headers = {"content-type": "application/json"}
    else:
        content = text.encode()
        headers = {"content-type": "text/plain"}

    return httpx.Response(
        status_code=status_code,
        content=content,
        headers=headers,
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )


def _chat_response(content: str, prompt_tokens: int = 100, completion_tokens: int = 50) -> dict:
    """Build a standard OpenRouter chat completion response body."""
    return {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": content,
                }
            }
        ],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
        },
    }


# ── Unit tests for helpers ──────────────────────────────────────────────────────


class TestBuildThinking:
    def test_off(self):
        assert _build_thinking("off") is None

    def test_low(self):
        result = _build_thinking("low")
        assert result == {"type": "enabled", "budget_tokens": 2000}

    def test_medium(self):
        result = _build_thinking("medium")
        assert result == {"type": "enabled", "budget_tokens": 5000}

    def test_high(self):
        result = _build_thinking("high")
        assert result == {"type": "enabled", "budget_tokens": 10000}

    def test_unknown_returns_none(self):
        assert _build_thinking("nonexistent") is None


class TestExtractUsage:
    def test_normal(self):
        data = {"usage": {"prompt_tokens": 150, "completion_tokens": 75}}
        assert _extract_usage(data) == {"input_tokens": 150, "output_tokens": 75}

    def test_missing_usage(self):
        assert _extract_usage({}) == {"input_tokens": 0, "output_tokens": 0}

    def test_partial_usage(self):
        data = {"usage": {"prompt_tokens": 42}}
        assert _extract_usage(data) == {"input_tokens": 42, "output_tokens": 0}


class TestAnthropicPrepareSchema:
    """Tests for Anthropic provider schema preparation (returns raw schema for prompt injection)."""

    def test_returns_schema_unchanged(self):
        provider = AnthropicProvider()
        schema = {"title": "Foo", "type": "object", "properties": {}}
        result = provider.prepare_schema(schema)
        assert result == schema

    def test_preserves_nested_structure(self):
        provider = AnthropicProvider()
        schema = {
            "type": "object",
            "properties": {
                "name": {"title": "Name", "type": "string"}
            },
        }
        result = provider.prepare_schema(schema)
        assert result["properties"]["name"]["title"] == "Name"

    def test_preserves_all_fields(self):
        provider = AnthropicProvider()
        schema = {"type": "string", "description": "hello", "title": "T"}
        result = provider.prepare_schema(schema)
        assert result == {"type": "string", "description": "hello", "title": "T"}


# ── Integration tests with mocked httpx ─────────────────────────────────────────


@pytest.fixture
def client():
    """Create an LLMClient instance (no real API calls)."""
    return LLMClient(api_key="test-key-123", default_model="test/model")


class TestCompleteStructured:
    @pytest.mark.asyncio
    async def test_success(self, client: LLMClient):
        structured_content = json.dumps({"name": "Test", "score": 0.95})
        mock_resp = _make_response(
            json_body=_chat_response(structured_content, 200, 80)
        )

        with patch.object(client._client, "request", new_callable=AsyncMock, return_value=mock_resp):
            result, usage = await client.complete_structured(
                system="You are a test.",
                user="Extract data.",
                response_schema=SimpleSchema,
                thinking="off",
            )

        assert isinstance(result, SimpleSchema)
        assert result.name == "Test"
        assert result.score == 0.95
        assert usage == {"input_tokens": 200, "output_tokens": 80}

    @pytest.mark.asyncio
    async def test_parse_error(self, client: LLMClient):
        mock_resp = _make_response(
            json_body=_chat_response("not valid json {{{", 100, 50)
        )

        with patch.object(client._client, "request", new_callable=AsyncMock, return_value=mock_resp):
            with pytest.raises(LLMParseError):
                await client.complete_structured(
                    system="sys",
                    user="usr",
                    response_schema=SimpleSchema,
                    thinking="off",
                )

    @pytest.mark.asyncio
    async def test_no_content_in_response(self, client: LLMClient):
        mock_resp = _make_response(json_body={"choices": []})

        with patch.object(client._client, "request", new_callable=AsyncMock, return_value=mock_resp):
            with pytest.raises(LLMParseError):
                await client.complete_structured(
                    system="sys",
                    user="usr",
                    response_schema=SimpleSchema,
                    thinking="off",
                )


class TestCompleteText:
    @pytest.mark.asyncio
    async def test_success(self, client: LLMClient):
        mock_resp = _make_response(
            json_body=_chat_response("Hello, world!", 50, 10)
        )

        with patch.object(client._client, "request", new_callable=AsyncMock, return_value=mock_resp):
            text, usage = await client.complete_text(
                system="You are helpful.",
                user="Say hello.",
                thinking="off",
            )

        assert text == "Hello, world!"
        assert usage == {"input_tokens": 50, "output_tokens": 10}


class TestRetryLogic:
    @pytest.mark.asyncio
    async def test_retry_on_429_then_success(self, client: LLMClient):
        rate_limit_resp = _make_response(status_code=429, text="rate limited")
        success_resp = _make_response(
            json_body=_chat_response("ok", 10, 5)
        )

        mock_request = AsyncMock(side_effect=[rate_limit_resp, success_resp])

        with patch.object(client._client, "request", mock_request):
            with patch("app.services.llm.asyncio.sleep", new_callable=AsyncMock):
                text, usage = await client.complete_text(
                    system="sys",
                    user="usr",
                    thinking="off",
                )

        assert text == "ok"
        assert mock_request.call_count == 2

    @pytest.mark.asyncio
    async def test_retry_on_500_then_success(self, client: LLMClient):
        server_err_resp = _make_response(status_code=500, text="internal error")
        success_resp = _make_response(
            json_body=_chat_response("recovered", 10, 5)
        )

        mock_request = AsyncMock(side_effect=[server_err_resp, success_resp])

        with patch.object(client._client, "request", mock_request):
            with patch("app.services.llm.asyncio.sleep", new_callable=AsyncMock):
                text, usage = await client.complete_text(
                    system="sys",
                    user="usr",
                    thinking="off",
                )

        assert text == "recovered"
        assert mock_request.call_count == 2

    @pytest.mark.asyncio
    async def test_exhausted_retries_raises(self, client: LLMClient):
        rate_limit_resp = _make_response(status_code=429, text="rate limited")
        mock_request = AsyncMock(return_value=rate_limit_resp)

        with patch.object(client._client, "request", mock_request):
            with patch("app.services.llm.asyncio.sleep", new_callable=AsyncMock):
                with pytest.raises(LLMRateLimitError):
                    await client.complete_text(
                        system="sys",
                        user="usr",
                        thinking="off",
                    )

        assert mock_request.call_count == 3

    @pytest.mark.asyncio
    async def test_4xx_not_retried(self, client: LLMClient):
        bad_req_resp = _make_response(status_code=400, text="bad request")
        mock_request = AsyncMock(return_value=bad_req_resp)

        with patch.object(client._client, "request", mock_request):
            with pytest.raises(LLMError) as exc_info:
                await client.complete_text(
                    system="sys",
                    user="usr",
                    thinking="off",
                )

        assert exc_info.value.status_code == 400
        assert mock_request.call_count == 1  # No retries


class TestCompleteStreaming:
    @pytest.mark.asyncio
    async def test_streaming_yields_chunks(self, client: LLMClient):
        sse_lines = [
            'data: {"choices":[{"delta":{"content":"Hello"}}]}',
            'data: {"choices":[{"delta":{"content":" world"}}]}',
            'data: {"choices":[{"delta":{"content":"!"}}]}',
            "data: [DONE]",
        ]

        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.aiter_lines = _async_line_iter(sse_lines)
        mock_response.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response.__aexit__ = AsyncMock(return_value=False)

        with patch.object(client._client, "stream", return_value=mock_response):
            chunks = []
            async for chunk in client.complete_streaming(
                system="sys",
                messages=[{"role": "user", "content": "hi"}],
                thinking="off",
            ):
                chunks.append(chunk)

        assert chunks == ["Hello", " world", "!"]

    @pytest.mark.asyncio
    async def test_streaming_skips_empty_deltas(self, client: LLMClient):
        sse_lines = [
            'data: {"choices":[{"delta":{}}]}',
            'data: {"choices":[{"delta":{"content":"only"}}]}',
            "data: [DONE]",
        ]

        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.aiter_lines = _async_line_iter(sse_lines)
        mock_response.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response.__aexit__ = AsyncMock(return_value=False)

        with patch.object(client._client, "stream", return_value=mock_response):
            chunks = []
            async for chunk in client.complete_streaming(
                system="sys",
                messages=[{"role": "user", "content": "hi"}],
                thinking="off",
            ):
                chunks.append(chunk)

        assert chunks == ["only"]


def _async_line_iter(lines: list[str]):
    """Create an async iterator factory for mock aiter_lines."""
    async def _iter():
        for line in lines:
            yield line
    return _iter


class TestListModels:
    @pytest.mark.asyncio
    async def test_list_models_filters_and_maps(self, client: LLMClient):
        api_response = {
            "data": [
                {
                    "id": "anthropic/claude-sonnet-4",
                    "name": "Claude Sonnet 4",
                    "context_length": 200000,
                    "pricing": {"prompt": "0.003", "completion": "0.015"},
                    "supported_parameters": ["json_schema", "temperature"],
                },
                {
                    "id": "meta/llama-3-8b",
                    "name": "Llama 3 8B",
                    "context_length": 8192,
                    "pricing": {"prompt": "0.0001", "completion": "0.0002"},
                    "supported_parameters": ["temperature"],
                    # No json_schema → filtered out
                },
                {
                    "id": "google/gemini-pro",
                    "name": "Gemini Pro",
                    "context_length": 128000,
                    "pricing": {"prompt": "0.001", "completion": "0.002"},
                    "supported_parameters": ["json_schema", "temperature", "top_p"],
                },
            ]
        }

        mock_resp = _make_response(json_body=api_response)

        with patch.object(client._client, "request", new_callable=AsyncMock, return_value=mock_resp):
            models = await client.list_models()

        # Mandatory models are added as fallbacks, so total > 2
        model_ids = [m["id"] for m in models]
        assert "anthropic/claude-sonnet-4" in model_ids
        assert "google/gemini-pro" in model_ids
        assert "meta/llama-3-8b" not in model_ids  # filtered out (no json_schema)

        # Check correct field mapping for a known model
        claude = next(m for m in models if m["id"] == "anthropic/claude-sonnet-4")
        assert claude["name"] == "Claude Sonnet 4"
        assert claude["context_length"] == 200000
        # Prices are per-million tokens (API returns per-token, code multiplies by 1M)
        assert claude["pricing_prompt"] == 3000.0
        assert claude["pricing_completion"] == 15000.0

    @pytest.mark.asyncio
    async def test_list_models_no_supported_params_filtered(self, client: LLMClient):
        """Models without json_schema support and not in mandatory list are filtered out."""
        api_response = {
            "data": [
                {
                    "id": "openai/gpt-4",
                    "name": "GPT-4",
                    "context_length": 8192,
                    "pricing": {"prompt": "0.03", "completion": "0.06"},
                    # No supported_parameters at all — filtered out
                },
            ]
        }

        mock_resp = _make_response(json_body=api_response)

        with patch.object(client._client, "request", new_callable=AsyncMock, return_value=mock_resp):
            models = await client.list_models()

        # Non-mandatory models without json_schema support are excluded;
        # only mandatory fallback models are added
        model_ids = {m["id"] for m in models}
        assert "openai/gpt-4" not in model_ids


class TestBuildBody:
    def test_includes_thinking_when_enabled(self, client: LLMClient):
        body = client._build_body(
            messages=[{"role": "user", "content": "hi"}],
            model=None,
            thinking="high",
        )
        assert body["thinking"] == {"type": "enabled", "budget_tokens": 10000}
        assert body["model"] == "test/model"

    def test_no_thinking_when_off(self, client: LLMClient):
        body = client._build_body(
            messages=[{"role": "user", "content": "hi"}],
            model="custom/model",
            thinking="off",
        )
        assert "thinking" not in body
        assert body["model"] == "custom/model"

    def test_response_format_included(self, client: LLMClient):
        fmt = {"type": "json_schema", "json_schema": {"name": "T", "strict": True, "schema": {}}}
        body = client._build_body(
            messages=[],
            model=None,
            response_format=fmt,
        )
        assert body["response_format"] == fmt

    def test_temperature_included(self, client: LLMClient):
        body = client._build_body(
            messages=[],
            model=None,
            temperature=0.7,
        )
        assert body["temperature"] == 0.7

    def test_temperature_none_excluded(self, client: LLMClient):
        body = client._build_body(messages=[], model=None)
        assert "temperature" not in body

    def test_thinking_config_overrides_legacy(self, client: LLMClient):
        """When thinking_config is provided, it overrides the legacy _build_thinking path."""
        body = client._build_body(
            messages=[],
            model=None,
            thinking="high",  # Would normally set thinking via _build_thinking
            thinking_config={"type": "enabled", "budget_tokens": 3000},
        )
        assert body["thinking"] == {"type": "enabled", "budget_tokens": 3000}

    def test_thinking_config_none_omits_thinking(self, client: LLMClient):
        """When thinking_config=None is passed, no thinking key is set."""
        body = client._build_body(
            messages=[],
            model=None,
            thinking="high",  # Would normally set thinking
            thinking_config=None,
        )
        assert "thinking" not in body


class TestClientLifecycle:
    @pytest.mark.asyncio
    async def test_close(self):
        llm = LLMClient(api_key="test")
        with patch.object(llm._client, "aclose", new_callable=AsyncMock) as mock_close:
            await llm.close()
            mock_close.assert_called_once()
