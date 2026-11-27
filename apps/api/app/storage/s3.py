"""Armazenamento em serviço compatível com S3 (Cloudflare R2)."""

from collections.abc import Iterator, Sequence

import boto3
from botocore.client import BaseClient
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.config import Settings
from app.storage.base import StorageError, StoredObject

# Limite da API do `delete_objects`.
DELETE_BATCH_SIZE = 1000


def build_s3_client(settings: Settings) -> BaseClient:
  """Cliente S3 apontado para o R2, com a configuração validada na FOTO-1."""
  return boto3.client(
    "s3",
    endpoint_url=settings.r2_endpoint_url,
    region_name="auto",
    aws_access_key_id=settings.r2_access_key_id,
    aws_secret_access_key=settings.r2_secret_access_key,
    config=Config(
      signature_version="s3v4",
      # NÃO REMOVER: a partir do boto3 1.36 o cliente calcula checksums em todo
      # envio por padrão, e serviços compatíveis com S3 recusam essas requisições.
      # `when_required` pede o checksum só quando a API exige.
      request_checksum_calculation="when_required",
      response_checksum_validation="when_required",
    ),
  )


class S3Storage:
  def __init__(self, client: BaseClient, bucket: str, url_expires_in: int) -> None:
    self._client = client
    self._bucket = bucket
    self._url_expires_in = url_expires_in

  def save(self, key: str, data: bytes, content_type: str) -> None:
    try:
      self._client.put_object(
        Bucket=self._bucket, Key=key, Body=data, ContentType=content_type
      )
    except (ClientError, BotoCoreError) as error:
      raise StorageError(f"Falha ao salvar '{key}'.") from error

  def delete(self, keys: Sequence[str]) -> None:
    for start in range(0, len(keys), DELETE_BATCH_SIZE):
      batch = keys[start : start + DELETE_BATCH_SIZE]
      try:
        response = self._client.delete_objects(
          Bucket=self._bucket,
          Delete={"Objects": [{"Key": key} for key in batch], "Quiet": True},
        )
      except (ClientError, BotoCoreError) as error:
        raise StorageError("Falha ao apagar objetos.") from error
      if response.get("Errors"):
        failed = [item.get("Key") for item in response["Errors"]]
        raise StorageError(f"Falha ao apagar objetos: {failed}.")

  def presigned_url(self, key: str) -> str:
    try:
      return self._client.generate_presigned_url(
        "get_object",
        Params={"Bucket": self._bucket, "Key": key},
        ExpiresIn=self._url_expires_in,
      )
    except (ClientError, BotoCoreError) as error:
      raise StorageError(f"Falha ao assinar '{key}'.") from error

  def list_objects(self, prefix: str) -> Iterator[StoredObject]:
    paginator = self._client.get_paginator("list_objects_v2")
    try:
      for page in paginator.paginate(Bucket=self._bucket, Prefix=prefix):
        for item in page.get("Contents", []):
          yield StoredObject(key=item["Key"], last_modified=item["LastModified"])
    except (ClientError, BotoCoreError) as error:
      raise StorageError(f"Falha ao listar '{prefix}'.") from error
