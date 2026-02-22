# backend/Dockerfile
# Multi-stage Docker build for Railway deployment using uv package manager
# Excludes docling (heavy ML dep) — uses pypdf + python-docx for parsing

# --- Stage 1: Build ---
FROM python:3.13-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files first (better caching)
COPY pyproject.toml uv.lock ./

# Install dependencies WITHOUT docling and its heavy ML deps
# Override: install everything from lock, then remove docling tree
RUN uv sync --frozen --no-dev --no-install-project && \
    uv pip uninstall docling docling-core docling-ibm-models docling-parse \
       deepsearch-glm torch torchvision onnxruntime transformers \
       huggingface-hub safetensors accelerate timm 2>/dev/null || true

# Copy application code
COPY . .

# Install the project itself
RUN uv sync --frozen --no-dev

# Clean up caches
RUN rm -rf /root/.cache/uv /root/.cache/pip

# --- Stage 2: Runtime ---
FROM python:3.13-slim AS runtime

WORKDIR /app

# Copy only the virtual environment and source code from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/app ./app
COPY --from=builder /app/pyproject.toml ./

# Add .venv to PATH
ENV PATH="/app/.venv/bin:$PATH"

# Create temp directory for file processing
RUN mkdir -p /tmp/foxdoc

# Railway sets PORT env var
ENV PORT=8000

EXPOSE ${PORT}

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
