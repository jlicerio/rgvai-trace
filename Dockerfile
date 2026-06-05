# Build stage: compile frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/tsconfig.json frontend/vite.config.ts ./
COPY frontend/index.html ./
COPY frontend/public/ ./public/
COPY frontend/src/ ./src/
RUN npm install && npm run build

# Runtime stage: Python + backend + static files
FROM python:3.14-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --only-binary :all: \
    fastapi uvicorn httpx pydantic python-dotenv sse-starlette cryptography
COPY backend/app/ ./app/
COPY --from=frontend-build /app/frontend/dist/ ./frontend/dist/
COPY backend/app/registry.json ./app/registry.json
RUN mkdir -p /data
ENV AUTH_DB_PATH=/data/pipeline.db TOOL_REGISTRY_PATH=/app/app/registry.json
EXPOSE 8083
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8083"]
