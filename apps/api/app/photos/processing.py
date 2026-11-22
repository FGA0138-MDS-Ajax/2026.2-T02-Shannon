"""Processamento das fotos enviadas pelo app (FOTO-3)."""

from dataclasses import dataclass

from PIL import Image

ALLOWED_FORMATS = {"JPEG", "PNG"}
MAX_PIXELS = 40_000_000
FULL_MAX_SIDE = 1280
THUMBNAIL_MAX_SIDE = 320
JPEG_QUALITY = 82
OUTPUT_CONTENT_TYPE = "image/jpeg"

Image.MAX_IMAGE_PIXELS = MAX_PIXELS


class UnsupportedImageError(Exception):
  """Formato fora de JPEG/PNG (vira 415 na FOTO-5)."""


class InvalidImageError(Exception):
  """Arquivo corrompido, truncado, vazio ou grande demais em pixels (vira 400)."""


@dataclass(frozen=True)
class ProcessedPhoto:
  full: bytes
  thumbnail: bytes
  width: int
  height: int


def process_photo(data: bytes) -> ProcessedPhoto:
  raise NotImplementedError
