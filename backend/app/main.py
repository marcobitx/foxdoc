# backend/app/main.py
# FastAPI application entry point
# Configures CORS, lifespan, and routes

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown hooks."""
    yield
    # Cleanup if needed (e.g. close LLM client connections)


app = FastAPI(
    title="Procurement Analyzer API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Will be locked down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include routers ────────────────────────────────────────────────────────────

from app.routers import analyze, models, notes, settings, user  # noqa: E402

app.include_router(analyze.router)
app.include_router(models.router)
app.include_router(notes.router)
app.include_router(settings.router)
app.include_router(user.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
