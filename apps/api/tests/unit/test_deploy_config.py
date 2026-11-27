from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from app.config import Settings, parse_cors_origins
from app.database import engine
from scripts.vercel_build import run_vercel_build


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


def test_cors_middleware_allows_only_configured_origin() -> None:
  test_app = FastAPI()
  test_app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins("https://habbit.vercel.app/"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
  )

  @test_app.get("/")
  async def root() -> str:
    return "OK"

  client = TestClient(test_app)

  allowed = client.get("/", headers={"Origin": "https://habbit.vercel.app"})
  assert allowed.status_code == 200
  assert allowed.headers.get("access-control-allow-origin") == (
    "https://habbit.vercel.app"
  )

  blocked = client.get("/", headers={"Origin": "https://evil.example.com"})
  assert blocked.status_code == 200
  assert "access-control-allow-origin" not in blocked.headers


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
