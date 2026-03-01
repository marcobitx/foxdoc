# backend/tests/test_api.py
# API endpoint tests using httpx AsyncClient + ASGITransport
# Tests all router endpoints against the in-memory DB backend

from __future__ import annotations

import io
import pytest
import pytest_asyncio

from httpx import ASGITransport, AsyncClient

from app.convex_client import ConvexDB, _db_instance
from app.main import app
from app.middleware.auth import require_auth
import app.convex_client as convex_module


async def _mock_require_auth():
    """Override auth dependency to return a fake user ID."""
    return "test-user-id"


@pytest_asyncio.fixture(autouse=True)
async def reset_db():
    """Reset the in-memory DB singleton before each test."""
    # Force a fresh in-memory DB for each test
    fresh_db = ConvexDB(url="")
    convex_module._db_instance = fresh_db
    # Override auth to bypass JWT validation in tests
    app.dependency_overrides[require_auth] = _mock_require_auth
    yield
    convex_module._db_instance = None
    app.dependency_overrides.pop(require_auth, None)


@pytest_asyncio.fixture
async def client():
    """Async HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ── Health check ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


# ── POST /api/analyze ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_analysis_no_files(client: AsyncClient):
    """Upload with no files should return 422 (validation error)."""
    response = await client.post("/api/analyze")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_analysis_unsupported_format(client: AsyncClient):
    """Upload with unsupported file format should return 400."""
    files = [("files", ("test.txt", b"hello world", "text/plain"))]
    response = await client.post("/api/analyze", files=files)
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_analysis_success(client: AsyncClient):
    """Upload valid PDF should return 202 with analysis detail."""
    # Create a minimal fake PDF (just bytes, pipeline will handle parsing)
    pdf_content = b"%PDF-1.4 fake pdf content for testing"
    files = [("files", ("test_doc.pdf", pdf_content, "application/pdf"))]

    response = await client.post(
        "/api/analyze",
        files=files,
        data={"model": "anthropic/claude-sonnet-4"},
    )
    assert response.status_code == 202
    data = response.json()
    assert "id" in data
    assert data["status"] == "pending"
    assert "progress" in data


@pytest.mark.asyncio
async def test_create_analysis_multiple_files(client: AsyncClient):
    """Upload multiple files should work."""
    files = [
        ("files", ("doc1.pdf", b"%PDF fake1", "application/pdf")),
        ("files", ("doc2.docx", b"PK fake docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")),
    ]
    response = await client.post("/api/analyze", files=files)
    assert response.status_code == 202


@pytest.mark.asyncio
async def test_create_analysis_zip_accepted(client: AsyncClient):
    """ZIP files should be accepted."""
    # Create a minimal ZIP-like file
    import zipfile

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("inner.pdf", b"%PDF-1.4 inner pdf")
    buf.seek(0)

    files = [("files", ("archive.zip", buf.read(), "application/zip"))]
    response = await client.post("/api/analyze", files=files)
    assert response.status_code == 202


@pytest.mark.asyncio
async def test_create_analysis_too_many_files(client: AsyncClient):
    """More than 20 files should be rejected."""
    files = [
        ("files", (f"doc_{i}.pdf", b"%PDF fake", "application/pdf"))
        for i in range(21)
    ]
    response = await client.post("/api/analyze", files=files)
    assert response.status_code == 400
    assert "Too many files" in response.json()["detail"]


# ── GET /api/analyze/{id} ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_analysis_not_found(client: AsyncClient):
    response = await client.get("/api/analyze/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_analysis_success(client: AsyncClient):
    """Create then retrieve an analysis."""
    files = [("files", ("test.pdf", b"%PDF fake", "application/pdf"))]
    create_resp = await client.post("/api/analyze", files=files)
    assert create_resp.status_code == 202
    analysis_id = create_resp.json()["id"]

    get_resp = await client.get(f"/api/analyze/{analysis_id}")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["id"] == analysis_id


# ── GET /api/analyses ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_analyses_empty(client: AsyncClient):
    response = await client.get("/api/analyses")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


@pytest.mark.asyncio
async def test_list_analyses_with_data(client: AsyncClient):
    """Create analyses then list them."""
    for i in range(3):
        files = [("files", (f"doc_{i}.pdf", b"%PDF fake", "application/pdf"))]
        resp = await client.post("/api/analyze", files=files)
        assert resp.status_code == 202

    response = await client.get("/api/analyses")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3


@pytest.mark.asyncio
async def test_list_analyses_pagination(client: AsyncClient):
    """Test limit and offset parameters."""
    for i in range(5):
        files = [("files", (f"doc_{i}.pdf", b"%PDF fake", "application/pdf"))]
        await client.post("/api/analyze", files=files)

    # Get first 2
    response = await client.get("/api/analyses", params={"limit": 2, "offset": 0})
    assert response.status_code == 200
    assert len(response.json()) == 2

    # Get next 2
    response = await client.get("/api/analyses", params={"limit": 2, "offset": 2})
    assert response.status_code == 200
    assert len(response.json()) == 2


# ── DELETE /api/analyze/{id} ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_analysis_not_found(client: AsyncClient):
    response = await client.delete("/api/analyze/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_analysis_success(client: AsyncClient):
    """Create then delete an analysis."""
    files = [("files", ("test.pdf", b"%PDF fake", "application/pdf"))]
    create_resp = await client.post("/api/analyze", files=files)
    analysis_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/api/analyze/{analysis_id}")
    assert del_resp.status_code == 204

    # Should be gone
    get_resp = await client.get(f"/api/analyze/{analysis_id}")
    assert get_resp.status_code == 404


# ── GET /api/settings ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_settings(client: AsyncClient):
    response = await client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert "has_api_key" in data
    assert "default_model" in data
    assert isinstance(data["has_api_key"], bool)


# ── PUT /api/settings ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_settings_model(client: AsyncClient):
    """Update default model."""
    response = await client.put(
        "/api/settings",
        json={"default_model": "openai/gpt-4o"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["default_model"] == "openai/gpt-4o"


@pytest.mark.asyncio
async def test_update_settings_api_key(client: AsyncClient):
    """Update API key."""
    response = await client.put(
        "/api/settings",
        json={"openrouter_api_key": "sk-test-key-12345"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["has_api_key"] is True


@pytest.mark.asyncio
async def test_update_settings_persists(client: AsyncClient):
    """Settings should persist across requests."""
    # Set API key
    await client.put(
        "/api/settings",
        json={"openrouter_api_key": "sk-persist-test"},
    )

    # Verify it persisted
    response = await client.get("/api/settings")
    data = response.json()
    assert data["has_api_key"] is True


# ── GET /api/analyze/{id}/chat/history ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_chat_history_not_found(client: AsyncClient):
    response = await client.get("/api/analyze/nonexistent/chat/history")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_chat_history_empty(client: AsyncClient):
    """New analysis should have empty chat history."""
    files = [("files", ("test.pdf", b"%PDF fake", "application/pdf"))]
    create_resp = await client.post("/api/analyze", files=files)
    analysis_id = create_resp.json()["id"]

    response = await client.get(f"/api/analyze/{analysis_id}/chat/history")
    assert response.status_code == 200
    assert response.json() == []


# ── POST /api/analyze/{id}/chat ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_chat_not_completed(client: AsyncClient):
    """Chat should fail if analysis is not completed."""
    files = [("files", ("test.pdf", b"%PDF fake", "application/pdf"))]
    create_resp = await client.post("/api/analyze", files=files)
    analysis_id = create_resp.json()["id"]

    response = await client.post(
        f"/api/analyze/{analysis_id}/chat",
        json={"message": "Hello"},
    )
    assert response.status_code == 400


# ── GET /api/analyze/{id}/export ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_export_not_completed(client: AsyncClient):
    """Export should fail if analysis is not completed."""
    files = [("files", ("test.pdf", b"%PDF fake", "application/pdf"))]
    create_resp = await client.post("/api/analyze", files=files)
    analysis_id = create_resp.json()["id"]

    response = await client.get(f"/api/analyze/{analysis_id}/export")
    assert response.status_code == 400
