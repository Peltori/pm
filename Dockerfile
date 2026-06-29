FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml frontend/.npmrc ./frontend/
WORKDIR /app/frontend
RUN npm install -g pnpm && pnpm install --frozen-lockfile --ignore-scripts

COPY frontend/ .
RUN CI=true pnpm run build

FROM python:3.12-slim AS backend-build

WORKDIR /app/backend

COPY backend/pyproject.toml ./
RUN pip install --no-cache-dir uv && \
    uv lock && uv sync --frozen --no-dev

COPY backend/app/ ./app/

FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY --from=backend-build /app/backend/.venv /app/backend/.venv
COPY --from=backend-build /app/backend/app /app/backend/app

# Next.js standalone build
COPY --from=frontend-build /app/frontend/.next/standalone /app/standalone
COPY --from=frontend-build /app/frontend/public /app/standalone/public
COPY --from=frontend-build /app/frontend/.next/static /app/standalone/.next/static

ENV PATH="/app/backend/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PORT=3000

EXPOSE 3000 8000

ENTRYPOINT []

CMD ["sh", "-c", "node /app/standalone/server.js & uvicorn app.main:app --host 0.0.0.0 --port 8000"]
