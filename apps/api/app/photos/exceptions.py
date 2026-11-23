PHOTO_MAX_BYTES = 5 * 1024 * 1024

MSG_PHOTO_NOT_TODAY = "Só é possível alterar a foto de um check-in de hoje."
MSG_PHOTO_TOO_LARGE = "A foto deve ter no máximo 5 MB."
MSG_PHOTO_UNSUPPORTED = "Formato não suportado. Envie uma imagem JPEG ou PNG."
MSG_PHOTO_INVALID = "Arquivo de imagem inválido."
MSG_PHOTO_STORAGE_FAILED = "Não foi possível salvar a foto. Tente novamente."


class PhotoNotTodayError(Exception):
  """Check-in não foi feito hoje e não aceita alteração ou remoção de foto."""


class PhotoTooLargeError(Exception):
  """Arquivo enviado ultrapassa o limite de 5 MB."""
