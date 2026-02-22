# backend/Dockerfile
# Multi-stage Docker build for Railway deployment using uv package manager
# Docling is optional (heavy ML dep) — uses pypdf + python-docx for parsing

# --- Stage 1: Build ---
FROM python:3.13-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files first (better caching)
COPY pyproject.toml uv.lock ./

# Install only core dependencies (no docling/torch/ML)
RUN uv sync --frozen --no-dev --no-install-project

# Copy application code
COPY . .

# Install the project itself
RUN uv sync --frozen --no-dev

# --- Stage 2: Runtime ---
FROM python:3.13-slim AS runtime

WORKDIR /app

# Copy only the virtual environment and source code from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/app ./app
COPY --from=builder /app/pyproject.toml ./

# Add .venv to PATH
ENV PATH="/app/.venv/bin:$PATH"

# Install DejaVu fonts for PDF export (Lithuanian character support)
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core && rm -rf /var/lib/apt/lists/*

# Create temp directory for file processing
RUN mkdir -p /tmp/foxdoc

# Railway sets PORT env var
ENV PORT=8000

EXPOSE ${PORT}

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
