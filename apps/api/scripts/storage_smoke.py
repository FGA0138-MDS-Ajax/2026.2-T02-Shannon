"""Teste de fumaça para validar o armazenamento S3-compatível (Cloudflare R2).

Execução (a partir de apps/api):
  uv run python scripts/storage_smoke.py
"""

from __future__ import annotations

import argparse
import os
import struct
import sys
import time
import urllib.error
import urllib.request
import zlib
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError


def _make_test_png(width: int = 32, height: int = 32) -> bytes:
  """Gera um PNG RGB sólido válido em memória para o teste de fumaça."""

  def _chunk(chunk_type: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)

  ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
  row = b"\x00" + (b"\x22\xc5\x5e" * width)  # verde sólido (RGB)
  idat = zlib.compress(row * height)
  return (
    b"\x89PNG\r\n\x1a\n"
    + _chunk(b"IHDR", ihdr)
    + _chunk(b"IDAT", idat)
    + _chunk(b"IEND", b"")
  )


_TEST_PNG_BYTES = _make_test_png()

_REQUIRED_ENV_VARS = (
  "R2_ENDPOINT_URL",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
)


def _load_env_file(env_path: Path) -> None:
  """Carrega variáveis de um arquivo .env sem sobrescrever o ambiente atual."""
  if not env_path.is_file():
    return

  for raw_line in env_path.read_text(encoding="utf-8").splitlines():
    line = raw_line.strip()
    if not line or line.startswith("#") or "=" not in line:
      continue
    key, value = line.split("=", 1)
    key = key.strip()
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
      value = value[1:-1]
    if key and key not in os.environ:
      os.environ[key] = value


def _get_required_config() -> dict[str, str]:
  """Lê as variáveis obrigatórias do R2 sem expor valores secretos."""
  missing = [name for name in _REQUIRED_ENV_VARS if not os.environ.get(name)]
  if missing:
    raise RuntimeError(f"Variáveis ausentes no ambiente/.env: {', '.join(missing)}")
  return {name: os.environ[name] for name in _REQUIRED_ENV_VARS}


def _build_client(cfg: dict[str, str], *, with_checksum_when_required: bool):
  """Cria um cliente S3 para o R2 com ou sem as opções de checksum."""
  if with_checksum_when_required:
    boto_config = Config(
      signature_version="s3v4",
      request_checksum_calculation="when_required",
      response_checksum_validation="when_required",
    )
  else:
    boto_config = Config(signature_version="s3v4")

  return boto3.client(
    "s3",
    endpoint_url=cfg["R2_ENDPOINT_URL"],
    region_name="auto",
    aws_access_key_id=cfg["R2_ACCESS_KEY_ID"],
    aws_secret_access_key=cfg["R2_SECRET_ACCESS_KEY"],
    config=boto_config,
  )


def _http_get(url: str, timeout: int = 15) -> tuple[int, bytes]:
  """Executa GET HTTP retornando (status_code, body)."""
  req = urllib.request.Request(url, method="GET")
  with urllib.request.urlopen(req, timeout=timeout) as resp:
    return resp.status, resp.read()


def main(non_interactive: bool = False) -> int:
  env_path = Path(__file__).resolve().parent.parent / ".env"
  _load_env_file(env_path)

  try:
    cfg = _get_required_config()
  except RuntimeError as exc:
    print(f"[CONFIG] ERRO: {exc}")
    return 1

  bucket = cfg["R2_BUCKET_NAME"]
  endpoint_url = cfg["R2_ENDPOINT_URL"].rstrip("/")
  timestamp = int(time.time())
  key = f"smoke/smoke-test-{timestamp}.png"
  no_checksum_key = f"smoke/smoke-test-{timestamp}-no-checksum.png"

  client = _build_client(cfg, with_checksum_when_required=True)
  client_no_checksum = _build_client(cfg, with_checksum_when_required=False)

  all_ok = True

  # Passo 1: envio com Config when_required
  try:
    client.put_object(
      Bucket=bucket,
      Key=key,
      Body=_TEST_PNG_BYTES,
      ContentType="image/png",
    )
    print(f"[PASSO 1] OK - put_object com when_required ({key})")
  except (BotoCoreError, ClientError) as exc:
    print(f"[PASSO 1] ERRO - falha no put_object com when_required: {exc}")
    all_ok = False
    return 1

  # Passo 2: envio sem opções de checksum (informativo)
  no_checksum_uploaded = False
  try:
    client_no_checksum.put_object(
      Bucket=bucket,
      Key=no_checksum_key,
      Body=_TEST_PNG_BYTES,
      ContentType="image/png",
    )
    no_checksum_uploaded = True
    print("[PASSO 2] INFO - put_object sem opções de checksum funcionou")
  except (BotoCoreError, ClientError) as exc:
    print(f"[PASSO 2] INFO - put_object sem opções de checksum falhou: {exc}")

  # Passo 3: URL pré-assinada de 300 s
  try:
    presigned_300 = client.generate_presigned_url(
      "get_object",
      Params={"Bucket": bucket, "Key": key},
      ExpiresIn=300,
    )
    status, body = _http_get(presigned_300)
    if status == 200 and body == _TEST_PNG_BYTES:
      print("[PASSO 3] OK - URL pré-assinada (300 s) respondeu HTTP 200")
      print(f"          Abra no celular (dados móveis): {presigned_300}")
      if not non_interactive and sys.stdin.isatty():
        input(
          "          Pressione Enter após testar a URL no celular "
          "para continuar para os passos 4-6..."
        )
    else:
      print(f"[PASSO 3] ERRO - status={status}, tamanho={len(body)}")
      all_ok = False
  except (BotoCoreError, ClientError, urllib.error.URLError) as exc:
    print(f"[PASSO 3] ERRO - falha na URL pré-assinada (300 s): {exc}")
    all_ok = False

  # Passo 4: URL pré-assinada de 5 s, aguardar 10 s e validar 403
  try:
    presigned_5 = client.generate_presigned_url(
      "get_object",
      Params={"Bucket": bucket, "Key": key},
      ExpiresIn=5,
    )
    print("[PASSO 4] Aguardando 10 s para expiração da URL de 5 s...")
    time.sleep(10)
    try:
      status, _ = _http_get(presigned_5)
      print(f"[PASSO 4] ERRO - URL expirada retornou HTTP {status} (esperado 403)")
      all_ok = False
    except urllib.error.HTTPError as http_exc:
      if http_exc.code == 403:
        print("[PASSO 4] OK - URL expirada recusada com HTTP 403")
      else:
        print(
          f"[PASSO 4] ERRO - URL expirada retornou HTTP {http_exc.code} (esperado 403)"
        )
        all_ok = False
  except (BotoCoreError, ClientError, urllib.error.URLError) as exc:
    print(f"[PASSO 4] ERRO - falha ao testar expiração: {exc}")
    all_ok = False

  # Passo 5: acesso ao objeto sem assinatura deve ser negado
  unsigned_url = f"{endpoint_url}/{bucket}/{key}"
  try:
    status, _ = _http_get(unsigned_url)
    print(f"[PASSO 5] ERRO - acesso sem assinatura retornou HTTP {status}")
    all_ok = False
  except urllib.error.HTTPError as http_exc:
    if 400 <= http_exc.code < 500:
      print(f"[PASSO 5] OK - acesso sem assinatura negado (HTTP {http_exc.code})")
    else:
      print(
        f"[PASSO 5] ERRO - resposta inesperada sem assinatura: HTTP {http_exc.code}"
      )
      all_ok = False
  except urllib.error.URLError as exc:
    print(f"[PASSO 5] ERRO - falha de rede no acesso sem assinatura: {exc}")
    all_ok = False

  # Passo 6: apagar objeto(s) de teste e conferir listagem com prefixo smoke/
  try:
    client.delete_object(Bucket=bucket, Key=key)
    if no_checksum_uploaded:
      client.delete_object(Bucket=bucket, Key=no_checksum_key)

    listed = client.list_objects_v2(Bucket=bucket, Prefix="smoke/")
    remaining_keys = {item["Key"] for item in listed.get("Contents", [])}
    if key not in remaining_keys and no_checksum_key not in remaining_keys:
      print("[PASSO 6] OK - objetos de teste removidos e ausentes na listagem")
    else:
      print("[PASSO 6] ERRO - objeto de teste ainda aparece na listagem")
      all_ok = False
  except (BotoCoreError, ClientError) as exc:
    print(f"[PASSO 6] ERRO - falha ao apagar/listar objetos: {exc}")
    all_ok = False

  return 0 if all_ok else 1


if __name__ == "__main__":
  parser = argparse.ArgumentParser(
    description="Teste de fumaça do armazenamento R2/S3."
  )
  parser.add_argument(
    "--non-interactive",
    action="store_true",
    help="Não pausa no passo 3 para teste manual no celular.",
  )
  args = parser.parse_args()
  raise SystemExit(main(non_interactive=args.non_interactive))
