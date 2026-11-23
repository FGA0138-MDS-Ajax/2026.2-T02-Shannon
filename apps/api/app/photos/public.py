from app.photos.models import CheckInPhoto
from app.photos.schemas import CheckInPhotoPublic
from app.storage.base import Storage


def photo_public(
  storage: Storage, photo: CheckInPhoto, include_full: bool
) -> CheckInPhotoPublic:
  """Monta o `CheckInPhotoPublic` com URLs assinadas a partir do registro.

  Fica fora de `app/photos/service.py` para o service de check-ins poder usá-la
  sem import circular. A URL assinada é um cálculo local, sem chamada de rede.
  """
  return CheckInPhotoPublic(
    thumbnail_url=storage.presigned_url(photo.thumbnail_key),
    url=storage.presigned_url(photo.full_key) if include_full else None,
  )
