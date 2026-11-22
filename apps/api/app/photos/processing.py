"""Processamento das fotos enviadas pelo app (FOTO-3)."""

from dataclasses import dataclass
from io import BytesIO

from PIL import Image, UnidentifiedImageError

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

  try:
    image = Image.open(BytesIO(data))
  except Image.DecompressionBombError as exc:
    raise InvalidImageError("imagem grande demais em pixels") from exc
  except UnidentifiedImageError as exc:
    raise UnsupportedImageError("formato de imagem não reconhecido") from exc
  except (OSError, SyntaxError, ValueError) as exc:
    raise InvalidImageError("arquivo de imagem corrompido") from exc
  if image.format not in ALLOWED_FORMATS:
    raise UnsupportedImageError(f"formato não aceito: {image.format}")

  width, height = image.size
  if width * height > MAX_PIXELS:
    raise InvalidImageError("imagem grande demais em pixels")

  try:
    image.load()
  except (OSError, SyntaxError, ValueError, Image.DecompressionBombError) as exc:
    raise InvalidImageError("arquivo de imagem corrompido ou truncado") from exc

  rgb = _to_rgb(image)
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


def _to_rgb(image: Image.Image) -> Image.Image:
  has_alpha = image.mode in ("RGBA", "LA", "PA") or (
    image.mode == "P" and "transparency" in image.info
  )
  if not has_alpha:
    return image.convert("RGB")
  rgba = image.convert("RGBA")
  background = Image.new("RGB", rgba.size, (255, 255, 255))
  background.paste(rgba, mask=rgba.getchannel("A"))
  return background


def _encode(image: Image.Image) -> bytes:
  buffer = BytesIO()
  image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
  return buffer.getvalue()
