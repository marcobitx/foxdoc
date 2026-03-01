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
