from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings, parse_cors_origins
from app.database import engine
from app.main import cors_options, docs_urls
from scripts.vercel_build import run_vercel_build

PWA_ORIGIN = "https://habbit.vercel.app"


def _settings(**overrides: Any) -> Settings:
  """`Settings` isolado do `.env` e das variáveis do sistema."""
  values: dict[str, Any] = {
    "DATABASE_URL": "postgresql://x:x@localhost/x",
    "JWT_SECRET_KEY": "x" * 32,
    "CORS_ORIGINS": "",
    "VERCEL_ENV": "",
    "ENABLE_DOCS": False,
  }
  values.update(overrides)
  return Settings(_env_file=None, **values)  # type: ignore[call-arg]


def test_parse_cors_origins_defaults_to_wildcard() -> None:
  assert parse_cors_origins("") == ["*"]
  assert parse_cors_origins("   ") == ["*"]
  assert parse_cors_origins("*") == ["*"]


def test_parse_cors_origins_splits_strips_and_removes_trailing_slash() -> None:
  raw = " https://habbit.vercel.app/ , http://localhost:8081/ , "
  assert parse_cors_origins(raw) == [
    "https://habbit.vercel.app",
    "http://localhost:8081",
  ]


def test_settings_database_url_migrations_prefers_direct_url() -> None:
  cfg = Settings(
    DATABASE_URL="postgres://user:pass@ep-pooler.neon.tech/db?sslmode=require",
    DIRECT_DATABASE_URL="postgres://user:pass@ep-direct.neon.tech/db?sslmode=require",
    JWT_SECRET_KEY="x" * 32,
  )
  assert cfg.database_url_sync.startswith("postgresql://user:pass@ep-pooler")
  assert cfg.database_url_migrations.startswith("postgresql://user:pass@ep-direct")


def test_settings_database_url_migrations_falls_back_to_database_url() -> None:
  cfg = Settings(
    DATABASE_URL="postgres://user:pass@localhost:5432/habbit",
    DIRECT_DATABASE_URL=None,
    JWT_SECRET_KEY="x" * 32,
  )
  assert cfg.database_url_migrations == "postgresql://user:pass@localhost:5432/habbit"


def test_engine_has_pool_pre_ping_enabled() -> None:
  assert engine.pool._pre_ping is True


def _cors_client(cfg: Settings) -> TestClient:
  """App mínimo com o mesmo CORS do `main.py` (via `cors_options`)."""
  test_app = FastAPI()
  test_app.add_middleware(CORSMiddleware, **cors_options(cfg))

  @test_app.get("/")
  async def root() -> str:
    return "OK"

  return TestClient(test_app)


def _preflight(client: TestClient, method: str, headers: str):
  return client.options(
    "/",
    headers={
      "Origin": PWA_ORIGIN,
      "Access-Control-Request-Method": method,
      "Access-Control-Request-Headers": headers,
    },
  )


# JWT_SECRET_KEY


def test_settings_rejects_short_jwt_secret() -> None:
  with pytest.raises(ValidationError):
    _settings(JWT_SECRET_KEY="x" * 31)


def test_settings_accepts_jwt_secret_with_32_chars() -> None:
  assert _settings(JWT_SECRET_KEY="x" * 32).JWT_SECRET_KEY == "x" * 32


# CORS obrigatório em produção


@pytest.mark.parametrize("raw", ["", "   ", "*", " , "])
def test_settings_rejects_open_cors_in_production(raw: str) -> None:
  with pytest.raises(ValidationError, match="CORS_ORIGINS"):
    _settings(VERCEL_ENV="production", CORS_ORIGINS=raw)


def test_settings_accepts_explicit_cors_in_production() -> None:
  cfg = _settings(VERCEL_ENV="production", CORS_ORIGINS=PWA_ORIGIN)
  assert cfg.is_production is True
  assert cfg.cors_origins_list == [PWA_ORIGIN]


@pytest.mark.parametrize("env", ["", "preview", "development"])
def test_settings_keeps_wildcard_cors_outside_production(env: str) -> None:
  cfg = _settings(VERCEL_ENV=env, CORS_ORIGINS="")
  assert cfg.is_production is False
  assert cfg.cors_origins_list == ["*"]


# Documentação (/docs, /redoc, /openapi.json)


def test_docs_urls_are_disabled_in_production() -> None:
  cfg = _settings(VERCEL_ENV="production", CORS_ORIGINS=PWA_ORIGIN)
  assert docs_urls(cfg) == {
    "docs_url": None,
    "redoc_url": None,
    "openapi_url": None,
  }


def test_docs_urls_can_be_reenabled_in_production() -> None:
  cfg = _settings(VERCEL_ENV="production", CORS_ORIGINS=PWA_ORIGIN, ENABLE_DOCS=True)
  assert docs_urls(cfg) == {}


@pytest.mark.parametrize("env", ["", "preview", "development"])
def test_docs_urls_keep_defaults_outside_production(env: str) -> None:
  assert docs_urls(_settings(VERCEL_ENV=env)) == {}


@pytest.mark.parametrize(
  ("enable_docs", "expected"),
  [(False, 404), (True, 200)],
)
def test_docs_routes_follow_docs_urls(enable_docs: bool, expected: int) -> None:
  cfg = _settings(
    VERCEL_ENV="production", CORS_ORIGINS=PWA_ORIGIN, ENABLE_DOCS=enable_docs
  )
  client = TestClient(FastAPI(**docs_urls(cfg)))
  for path in ("/docs", "/redoc", "/openapi.json"):
    assert client.get(path).status_code == expected


# CORS (configuração real, via cors_options)


def test_cors_options_are_restricted() -> None:
  options = cors_options(_settings(CORS_ORIGINS=PWA_ORIGIN))
  assert options["allow_origins"] == [PWA_ORIGIN]
  assert options["allow_credentials"] is False
  assert options["allow_methods"] == ["GET", "POST", "PUT", "PATCH", "DELETE"]
  assert options["allow_headers"] == ["Authorization", "Content-Type"]
  assert options["max_age"] == 600


def test_cors_allows_only_configured_origin() -> None:
  client = _cors_client(_settings(CORS_ORIGINS=PWA_ORIGIN + "/"))

  allowed = client.get("/", headers={"Origin": PWA_ORIGIN})
  assert allowed.status_code == 200
  assert allowed.headers.get("access-control-allow-origin") == PWA_ORIGIN
  assert "access-control-allow-credentials" not in allowed.headers

  blocked = client.get("/", headers={"Origin": "https://evil.example.com"})
  assert blocked.status_code == 200
  assert "access-control-allow-origin" not in blocked.headers


def test_cors_preflight_accepts_what_the_app_sends() -> None:
  client = _cors_client(_settings(CORS_ORIGINS=PWA_ORIGIN))
  for method in ("GET", "POST", "PUT", "PATCH", "DELETE"):
    response = _preflight(client, method, "authorization,content-type")
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == PWA_ORIGIN
    assert response.headers["access-control-max-age"] == "600"
    assert "access-control-allow-credentials" not in response.headers


def test_cors_preflight_rejects_unlisted_method_and_header() -> None:
  client = _cors_client(_settings(CORS_ORIGINS=PWA_ORIGIN))
  assert _preflight(client, "TRACE", "authorization").status_code == 400
  assert _preflight(client, "GET", "x-custom").status_code == 400


def test_vercel_build_skips_migrations_outside_production() -> None:
  called: list[list[str]] = []
  code = run_vercel_build(
    env={"VERCEL_ENV": "preview"},
    runner=lambda cmd: (called.append(cmd), 0)[1],
  )
  assert code == 0
  assert called == []


def test_vercel_build_fails_in_production_without_direct_url() -> None:
  called: list[list[str]] = []
  code = run_vercel_build(
    env={"VERCEL_ENV": "production"},
    runner=lambda cmd: (called.append(cmd), 0)[1],
  )
  assert code == 1
  assert called == []


def test_vercel_build_runs_alembic_in_production_and_propagates_status() -> None:
  called: list[list[str]] = []
  ok_code = run_vercel_build(
    env={
      "VERCEL_ENV": "production",
      "DIRECT_DATABASE_URL": "postgresql://u:p@ep-direct.neon.tech/db",
    },
    runner=lambda cmd: (called.append(cmd), 0)[1],
  )
  assert ok_code == 0
  assert len(called) == 1
  assert called[0][-3:] == ["alembic", "upgrade", "head"]

  fail_code = run_vercel_build(
    env={
      "VERCEL_ENV": "production",
      "DIRECT_DATABASE_URL": "postgresql://u:p@ep-direct.neon.tech/db",
    },
    runner=lambda _cmd: 2,
  )
  assert fail_code == 2
