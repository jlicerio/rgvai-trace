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
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --only-binary :all: -r requirements.txt
COPY backend/app/ ./app/
COPY --from=frontend-build /app/frontend/dist/ ./frontend/dist/
COPY backend/app/registry.json ./app/registry.json
RUN mkdir -p /data
ENV AUTH_DB_PATH=/data/pipeline.db TOOL_REGISTRY_PATH=/app/app/registry.json
EXPOSE 8083
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8083/api/health')" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8083"]
