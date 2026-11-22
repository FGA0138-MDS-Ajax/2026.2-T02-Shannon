"""Processamento das fotos enviadas pelo app (FOTO-3)."""

from dataclasses import dataclass
from io import BytesIO

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


_JPEG_MAGIC = b"\xff\xd8\xff"
_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def process_photo(data: bytes) -> ProcessedPhoto:
  if not data.startswith((_JPEG_MAGIC, _PNG_MAGIC)):
    raise UnsupportedImageError("o arquivo não é JPEG nem PNG")

  image = Image.open(BytesIO(data))
  if image.format not in ALLOWED_FORMATS:
    raise UnsupportedImageError(f"formato não aceito: {image.format}")
  image.load()

  rgb = image.convert("RGB")
  full = rgb.copy()
  full.thumbnail((FULL_MAX_SIDE, FULL_MAX_SIDE), Image.Resampling.LANCZOS)
  thumbnail = full.copy()
  thumbnail.thumbnail(
    (THUMBNAIL_MAX_SIDE, THUMBNAIL_MAX_SIDE), Image.Resampling.LANCZOS
  )

  return ProcessedPhoto(
    full=_encode(full),
    thumbnail=_encode(thumbnail),
    width=full.width,
    height=full.height,
  )


def _encode(image: Image.Image) -> bytes:
  buffer = BytesIO()
  image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
  return buffer.getvalue()
