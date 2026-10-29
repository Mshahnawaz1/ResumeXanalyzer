# Must satisfy requires-python in pyproject.toml (>=3.13)
FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /backend

# Enable virtualenv binary execution globally
ENV PATH="/backend/.venv/bin:$PATH"

# 1. Copy dependency manifest files first (leverages Docker caching)
COPY pyproject.toml uv.lock ./

# 2. Sync runtime dependencies only into .venv
RUN uv sync --no-cache --frozen --no-dev

COPY . .

# Honour $PORT when the host provides one (Render, Railway, Cloud Run, ...)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
