"""Testes da FOTO-3: `process_photo` (seção 5 da issue).

Todas as imagens são geradas aqui com Pillow, sem arquivos binários no repositório.
Rodam sem Docker: `uv run pytest tests/photos/unit`.
"""

from io import BytesIO

import pytest
from PIL import ExifTags, Image

from app.photos.processing import (
  InvalidImageError,
  ProcessedPhoto,
  UnsupportedImageError,
  process_photo,
)

JPEG_MAGIC = b"\xff\xd8\xff"
VERMELHO = (200, 30, 30)


def _encode(image: Image.Image, fmt: str, **params) -> bytes:
  buffer = BytesIO()
  image.save(buffer, fmt, **params)
  return buffer.getvalue()


def _jpeg(size: tuple[int, int], **params) -> bytes:
  return _encode(Image.new("RGB", size, VERMELHO), "JPEG", **params)


def _open(data: bytes) -> Image.Image:
  image = Image.open(BytesIO(data))
  image.load()
  return image


def _assert_jpeg(data: bytes) -> None:
  assert isinstance(data, bytes)
  assert data.startswith(JPEG_MAGIC)
  assert _open(data).format == "JPEG"


def _assert_vermelho(pixel: tuple[int, int, int]) -> None:
  r, g, b = pixel
  assert r >= 170
  assert g <= 70
  assert b <= 70


# --- 1. Redimensionamento ---


def test_jpeg_grande_vira_cheia_1280x960_e_miniatura_320x240():
  result = process_photo(_jpeg((4000, 3000)))

  assert isinstance(result, ProcessedPhoto)
  _assert_jpeg(result.full)
  _assert_jpeg(result.thumbnail)
  assert _open(result.full).size == (1280, 960)
  assert _open(result.thumbnail).size == (320, 240)
  assert (result.width, result.height) == (1280, 960)


# --- 2. Transparência ---


def test_png_transparente_nao_aumenta_e_ganha_fundo_branco():
  # Metade esquerda transparente com RGB preto: `convert("RGB")` ingênuo daria preto.
  image = Image.new("RGBA", (200, 100), (0, 0, 0, 0))
  image.paste((*VERMELHO, 255), (100, 0, 200, 100))

  result = process_photo(_encode(image, "PNG"))

  _assert_jpeg(result.full)
  _assert_jpeg(result.thumbnail)
  full = _open(result.full)
  assert full.size == (200, 100)
  assert _open(result.thumbnail).size == (200, 100)
  assert (result.width, result.height) == (200, 100)
  assert full.mode == "RGB"
  assert all(canal >= 245 for canal in full.getpixel((50, 50)))
  _assert_vermelho(full.getpixel((150, 50)))


# --- 3. Texto disfarçado de .jpg ---


def test_texto_com_extensao_jpg_e_recusado():
  with pytest.raises(UnsupportedImageError):
    process_photo(b"<script>alert(1)</script>")


# --- 4. Código colado no fim de um JPEG válido ---


def test_codigo_colado_no_fim_do_jpeg_e_descartado():
  payload = b"<?php system($_GET['c']); ?>"
  data = _jpeg((640, 480)) + payload

  result = process_photo(data)

  _assert_jpeg(result.full)
  _assert_jpeg(result.thumbnail)
  for saida in (result.full, result.thumbnail):
    assert payload not in saida
    assert b"<?php" not in saida


# --- 5. JPEG truncado ---


def test_jpeg_truncado_e_invalido():
  # Ruído deixa o arquivo grande: a metade ainda tem o cabeçalho, mas não os dados.
  ruido = Image.effect_noise((800, 600), 64).convert("RGB")
  completo = _encode(ruido, "JPEG")
  truncado = completo[: len(completo) // 2]
  assert Image.open(BytesIO(truncado)).format == "JPEG"  # cabeçalho intacto

  with pytest.raises(InvalidImageError):
    process_photo(truncado)


# --- 6. Bomba de descompressão ---


def test_png_pequeno_com_muitos_pixels_e_invalido():
  # Modo "1" (1 bit por pixel) para o próprio teste não gastar 300 MB de memória.
  data = _encode(Image.new("1", (10000, 10000)), "PNG")
  assert len(data) < 5 * 1024 * 1024  # arquivo pequeno, 100 milhões de pixels

  with pytest.raises(InvalidImageError):
    process_photo(data)


# --- 7. Formatos válidos fora da lista ---


@pytest.mark.parametrize("formato", ["GIF", "WEBP"])
def test_gif_e_webp_validos_sao_recusados(formato):
  data = _encode(Image.new("RGB", (50, 50), VERMELHO), formato)

  with pytest.raises(UnsupportedImageError):
    process_photo(data)


# --- 8. Vazio ---


def test_bytes_vazios_sao_recusados():
  with pytest.raises(UnsupportedImageError):
    process_photo(b"")


# --- 9. EXIF com GPS ---


def test_exif_com_gps_e_removido():
  exif = Image.Exif()
  gps = exif.get_ifd(ExifTags.IFD.GPSInfo)
  gps[ExifTags.GPS.GPSLatitudeRef] = "S"
  gps[ExifTags.GPS.GPSLatitude] = (15.0, 47.0, 0.0)
  gps[ExifTags.GPS.GPSLongitudeRef] = "W"
  gps[ExifTags.GPS.GPSLongitude] = (47.0, 52.0, 0.0)
  data = _jpeg((640, 480), exif=exif)
  assert Image.open(BytesIO(data)).getexif().get_ifd(ExifTags.IFD.GPSInfo)

  result = process_photo(data)

  for saida in (result.full, result.thumbnail):
    imagem = _open(saida)
    assert len(imagem.getexif()) == 0
    assert "exif" not in imagem.info


# --- 10. Rotação do EXIF ---


def test_orientacao_6_do_exif_e_aplicada():
  exif = Image.Exif()
  exif[ExifTags.Base.Orientation] = 6
  data = _jpeg((300, 200), exif=exif)

  result = process_photo(data)

  assert _open(result.full).size == (200, 300)
  assert _open(result.thumbnail).size == (200, 300)
  assert (result.width, result.height) == (200, 300)


# --- 11. O original nunca é devolvido ---


def _png_rgb() -> bytes:
  return _encode(Image.new("RGB", (200, 100), VERMELHO), "PNG")


@pytest.mark.parametrize(
  "data",
  [
    pytest.param(_jpeg((4000, 3000)), id="jpeg-grande"),
    pytest.param(_jpeg((100, 100)), id="jpeg-pequeno-sem-redimensionar"),
    pytest.param(_png_rgb(), id="png"),
  ],
)
def test_original_nunca_e_devolvido(data):
  result = process_photo(data)

  assert result.full != data
  assert result.thumbnail != data
