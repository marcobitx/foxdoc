# backend/app/services/providers/registry.py
# Provider registry — maps model ID prefixes to provider strategy singletons
# Single entry point for obtaining the correct provider for any model
# Related: base.py, anthropic.py, generic.py

from app.services.providers.base import BaseProvider
from app.services.providers.generic import GenericProvider

# Lazy imports for concrete providers to avoid circular deps and keep startup light.
# Each provider module is only imported when first needed.

_PREFIX_MAP: dict[str, str] = {
    "anthropic/": "anthropic",
    "openai/": "openai",
    "google/": "google",
}

_instances: dict[str, BaseProvider] = {}


def _create_provider(provider_key: str) -> BaseProvider:
    """Instantiate a provider by key, importing the module lazily."""
    if provider_key == "anthropic":
        from app.services.providers.anthropic import AnthropicProvider

        return AnthropicProvider()
    elif provider_key == "openai":
        # OpenAIProvider not yet implemented — fall back to generic
        return GenericProvider()
    elif provider_key == "google":
        # GoogleProvider not yet implemented — fall back to generic
        return GenericProvider()
    else:
        return GenericProvider()


def get_provider(model_id: str) -> BaseProvider:
    """Return the appropriate provider singleton for a model ID.

    Detects provider from the model_id prefix (e.g. 'anthropic/claude-sonnet-4'
    -> AnthropicProvider). Unknown prefixes get GenericProvider.
    """
    provider_key = "generic"
    for prefix, key in _PREFIX_MAP.items():
        if model_id.startswith(prefix):
            provider_key = key
            break

    if provider_key not in _instances:
        _instances[provider_key] = _create_provider(provider_key)

    return _instances[provider_key]
