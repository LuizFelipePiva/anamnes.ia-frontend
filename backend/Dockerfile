# =============================================
# Stage 1: base — dependências instaladas
# =============================================
FROM python:3.12-slim AS base

WORKDIR /app

# Evita bytecode .pyc e torna logs imediatos
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Dependências do sistema (psycopg2 precisa de libpq)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# =============================================
# Stage 2: development — hot reload
# =============================================
FROM base AS development

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]


# =============================================
# Stage 3: production — sem reload, sem dev deps
# =============================================
FROM base AS production

COPY . .

# Railway injeta $PORT; localmente usa 8000 como fallback
EXPOSE ${PORT:-8000}

# Shell form para expandir $PORT em runtime
# --proxy-headers: atrás do proxy (Render/Railway), request.client.host passa a ser
# o IP real do usuário (X-Forwarded-For) — sem isso o rate limit por IP vira global
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2 --proxy-headers --forwarded-allow-ips "*" --log-level info
