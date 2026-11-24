FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Copia os arquivos de dependências primeiro para cache eficiente das camadas
COPY pyproject.toml uv.lock ./

# Instala dependências sem o projeto
RUN uv sync --frozen --no-install-project --no-dev

# Copia o restante do código fonte
COPY . /app

# Sincroniza o projeto
RUN uv sync --frozen --no-dev

# Imagem final enxuta para execução
FROM python:3.13-slim-bookworm AS runner

WORKDIR /app

# Usuário não-root por boas práticas de segurança
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copia a aplicação e o ambiente virtual do builder
COPY --from=builder --chown=appuser:appuser /app /app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

USER appuser

EXPOSE 8000

CMD ["fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
