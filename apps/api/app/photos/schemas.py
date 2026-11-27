from pydantic import BaseModel


class CheckInPhotoPublic(BaseModel):
  """Foto de um check-in na resposta da API.

  `thumbnail_url` sempre vem; `url`, da foto em tamanho cheio, só quando a rota a
  entrega.
  """

  thumbnail_url: str
  url: str | None = None
