"""Processamento das fotos enviadas pelo app (FOTO-3).

Recebe os bytes do upload e devolve duas imagens JPEG **novas**: a versão cheia e a
miniatura. O Pillow não é antivírus e não detecta scripts; a proteção vem de nunca
guardar nem servir o original. Decodificamos só os pixels e geramos bytes novos, de
modo que metadados (EXIF, GPS, comentários, perfis ICC, XMP) e qualquer coisa colada
no fim do arquivo ficam para trás.

Função pura: não usa banco, armazenamento nem FastAPI. O limite de 5 MB do upload é
conferido na FOTO-5, antes de chamar `process_photo`.
"""

from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

ALLOWED_FORMATS = {"JPEG", "PNG"}
MAX_PIXELS = 40_000_000
FULL_MAX_SIDE = 1280
THUMBNAIL_MAX_SIDE = 320
JPEG_QUALITY = 82
OUTPUT_CONTENT_TYPE = "image/jpeg"

# Segunda barreira contra bomba de descompressão: o próprio `Image.open` avisa acima
# deste limite e recusa acima do dobro. Vale para o processo inteiro.
Image.MAX_IMAGE_PIXELS = MAX_PIXELS

_JPEG_MAGIC = b"\xff\xd8\xff"
_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
_WHITE = (255, 255, 255)

# Erros que o Pillow levanta ao ler um arquivo corrompido ou truncado.
_DECODE_ERRORS = (OSError, SyntaxError, ValueError)


class UnsupportedImageError(Exception):
  """Formato fora de JPEG/PNG (vira 415 na FOTO-5)."""


class InvalidImageError(Exception):
  """Arquivo corrompido, truncado, vazio ou grande demais em pixels (vira 400)."""


@dataclass(frozen=True)
class ProcessedPhoto:
  """Fotos regravadas em JPEG; `width` e `height` são da versão cheia."""

  full: bytes
  thumbnail: bytes
  width: int
  height: int


def process_photo(data: bytes) -> ProcessedPhoto:
  """Valida a foto e devolve a versão cheia e a miniatura, ambas JPEG novas.

  Levanta `UnsupportedImageError` se o conteúdo não for JPEG nem PNG, e
  `InvalidImageError` se o arquivo estiver corrompido, truncado ou tiver pixels
  demais. Nenhuma outra exceção do Pillow escapa.
  """
  _check_signature(data)
  image = _open(data)
  _check_pixel_count(image)
  _decode(image)

  # A rotação mora no EXIF, que será descartado: aplicamos antes, senão a foto
  # tirada em pé sairia deitada.
  upright = ImageOps.exif_transpose(image)
  rgb = _to_rgb(upright)

  # `thumbnail` reduz no lugar e nunca aumenta; por isso trabalhamos em cópias.
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


def _check_signature(data: bytes) -> None:
  """Passo 1: confere os bytes iniciais antes de entregar o arquivo ao Pillow.

  Extensão e `Content-Type` vêm do cliente e não valem nada. A assinatura é a
  primeira barreira: o que não começa como JPEG ou PNG nem chega ao decodificador
  (o Pillow entende dezenas de formatos, e cada um é uma superfície de ataque).
  """
  if not data.startswith((_JPEG_MAGIC, _PNG_MAGIC)):
    raise UnsupportedImageError("o arquivo não é JPEG nem PNG")


def _open(data: bytes) -> Image.Image:
  """Passo 2: abre o arquivo e confere o formato detectado pelo Pillow.

  `Image.open` é preguiçoso: lê só o cabeçalho, sem decodificar os pixels. A ordem
  dos `except` importa, porque `DecompressionBombError` e `UnidentifiedImageError`
  são subclasses de `OSError`.
  """
  try:
    image = Image.open(BytesIO(data))
  except Image.DecompressionBombError as exc:
    # Acima do dobro de `MAX_IMAGE_PIXELS` o próprio `open` já recusa.
    raise InvalidImageError("imagem grande demais em pixels") from exc
  except UnidentifiedImageError as exc:
    raise UnsupportedImageError("formato de imagem não reconhecido") from exc
  except _DECODE_ERRORS as exc:
    # A assinatura era válida, mas o resto do cabeçalho é lixo: arquivo corrompido.
    raise InvalidImageError("arquivo de imagem corrompido") from exc

  if image.format not in ALLOWED_FORMATS:
    raise UnsupportedImageError(f"formato não aceito: {image.format}")
  return image


def _check_pixel_count(image: Image.Image) -> None:
  """Passo 3: barra imagens gigantes ANTES de decodificar.

  Um PNG de poucos KB pode declarar 100 milhões de pixels e virar gigabytes na
  memória no `load()` (bomba de descompressão). O tamanho vem do cabeçalho, então
  conferir aqui custa nada. `MAX_PIXELS` é lido na hora da chamada.
  """
  width, height = image.size
  if width * height > MAX_PIXELS:
    raise InvalidImageError("imagem grande demais em pixels")


def _decode(image: Image.Image) -> None:
  """Passo 4: decodifica os pixels; arquivos truncados só falham aqui."""
  try:
    image.load()
  except (*_DECODE_ERRORS, Image.DecompressionBombError) as exc:
    raise InvalidImageError("arquivo de imagem corrompido ou truncado") from exc


def _to_rgb(image: Image.Image) -> Image.Image:
  """Passo 6: converte para RGB, compondo a transparência sobre fundo branco.

  JPEG não tem canal alfa. Um `convert("RGB")` direto descarta o alfa e deixa à
  mostra a cor guardada nos pixels transparentes (geralmente preto).
  """
  has_alpha = image.mode in ("RGBA", "LA", "PA") or (
    image.mode == "P" and "transparency" in image.info
  )
  if not has_alpha:
    return image.convert("RGB")

  rgba = image.convert("RGBA")
  background = Image.new("RGB", rgba.size, _WHITE)
  background.paste(rgba, mask=rgba.getchannel("A"))
  return background


def _encode(image: Image.Image) -> bytes:
  """Passo 9: grava um JPEG novo, sem nenhum metadado do original.

  Não passamos `exif` nem `icc_profile`, e esvaziamos o `info`: o Pillow reaproveita
  campos dele ao salvar (ex.: `comment`, o marcador COM do JPEG) mesmo sem pedirmos.
  """
  image.info = {}
  buffer = BytesIO()
  image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
  return buffer.getvalue()
