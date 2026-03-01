# backend/app/services/providers/base.py
# Abstract base class for LLM provider strategies
# Defines the interface that each provider must implement
# Related: anthropic.py, openai.py, google.py, generic.py

from abc import ABC, abstractmethod


class BaseProvider(ABC):
    """Strategy interface for LLM provider-specific behavior."""

    @abstractmethod
    def prepare_schema(self, raw_schema: dict) -> dict:
        """Clean and format JSON schema for this provider's requirements."""
        ...

    @abstractmethod
    def build_response_format(self, cleaned_schema: dict, schema_name: str) -> dict:
        """Build the response_format parameter for the API request."""
        ...

    @abstractmethod
    def build_messages(self, system: str, user: str | list[dict]) -> list[dict]:
        """Build the messages array with provider-specific formatting."""
        ...

    @abstractmethod
    def build_thinking_config(self, thinking: str) -> dict | None:
        """Build thinking/reasoning config. Returns None if thinking disabled."""
        ...

    @abstractmethod
    def get_temperature(self, requested_temp: float, thinking: str) -> float | None:
        """Return the temperature to use, considering provider constraints."""
        ...

    @abstractmethod
    def supports_native_pdf(self) -> bool:
        """Whether this provider supports native PDF input (base64 document blocks)."""
        ...
