"""Imagens geradas com Pillow para os testes de foto.

Nenhum teste precisa de arquivo binário no repositório: a imagem nasce em memória.
"""

from io import BytesIO

from PIL import Image


def encode_image(image: Image.Image, fmt: str, **params) -> bytes:
  """Serializa a imagem no formato pedido (`"JPEG"`, `"PNG"`...)."""
  buffer = BytesIO()
  image.save(buffer, fmt, **params)
  return buffer.getvalue()


def jpeg_bytes(size: tuple[int, int] = (100, 100), **params) -> bytes:
  """JPEG vermelho do tamanho dado. `params` vai direto para o `Image.save`."""
  return encode_image(Image.new("RGB", size, (200, 30, 30)), "JPEG", **params)


def png_bytes(size: tuple[int, int] = (100, 100), **params) -> bytes:
  """PNG azul do tamanho dado. `params` vai direto para o `Image.save`."""
  return encode_image(Image.new("RGB", size, (30, 60, 200)), "PNG", **params)


def photo_files(
  content: bytes, name: str = "foto.jpg", mime: str = "image/jpeg"
) -> dict:
  """Campo `photo` do multipart, no formato do argumento `files=` do cliente."""
  return {"photo": (name, content, mime)}
