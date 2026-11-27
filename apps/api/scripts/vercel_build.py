"""Script de build da API na Vercel.

Aplica as migrações do Alembic somente em produção (VERCEL_ENV=production),
exigindo DIRECT_DATABASE_URL (conexão direta sem pooler). Se a migração
falhar, o processo termina com código diferente de zero e interrompe o build.
"""

from __future__ import annotations

import os
import subprocess
import sys
from collections.abc import Callable, Mapping


def run_vercel_build(
  env: Mapping[str, str] | None = None,
  runner: Callable[[list[str]], int] | None = None,
) -> int:
  effective_env = os.environ if env is None else env
  vercel_env = effective_env.get("VERCEL_ENV", "")

  if vercel_env != "production":
    print(
      f"[vercel-build] VERCEL_ENV={vercel_env!r} (!= 'production'): "
      "pulando migrações automáticas."
    )
    return 0

  if not effective_env.get("DIRECT_DATABASE_URL", "").strip():
    print(
      "[vercel-build] ERRO: DIRECT_DATABASE_URL é obrigatória em produção "
      "para aplicar as migrações do Alembic sem pooler.",
      file=sys.stderr,
    )
    return 1

  cmd = [sys.executable, "-m", "alembic", "upgrade", "head"]
  print("[vercel-build] Aplicando migrações em produção (alembic upgrade head)...")

  if runner is not None:
    return runner(cmd)

  result = subprocess.run(cmd, check=False)
  return result.returncode


if __name__ == "__main__":
  raise SystemExit(run_vercel_build())
