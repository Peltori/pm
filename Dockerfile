FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

COPY frontend/ .
RUN CI=true npm run build

FROM python:3.12-slim AS backend-build

WORKDIR /app/backend

COPY backend/pyproject.toml ./
RUN pip install --no-cache-dir uv && \
    uv lock && uv sync --frozen --no-dev

COPY backend/app/ ./app/
COPY backend/.env ./

FROM python:3.12-slim

WORKDIR /app/backend

COPY --from=backend-build /app/backend/.venv /app/backend/.venv
COPY --from=backend-build /app/backend/app /app/backend/app
COPY --from=backend-build /app/backend/.env /app/backend/.env
COPY --from=backend-build /app/backend/.env /app/backend/.env
COPY --from=frontend-build /app/frontend/.next /app/frontend/.next
RUN mkdir -p /app/frontend/out && \
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Kanban Studio</title></head><body><h1>Kanban Studio</h1><p>Hello World — Part 2 scaffolding</p></body></html>' > /app/frontend/out/index.html

ENV PATH="/app/backend/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
