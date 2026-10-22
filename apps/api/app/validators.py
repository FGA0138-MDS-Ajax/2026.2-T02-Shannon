from pydantic import BeforeValidator

MSG_NUL_CHARACTER = "O texto não pode conter o caractere nulo."


def _reject_nul(value: object) -> object:
  """Recusa texto com o caractere NUL (`\\x00`), que o PostgreSQL não grava.

  Sem esta checagem, o erro só aparece no banco e a API responde 500.
  """
  if isinstance(value, str) and "\x00" in value:
    raise ValueError(MSG_NUL_CHARACTER)
  return value


# Uso: `Annotated[str, NoNul, ...]` em todo campo de texto que chega ao banco.
NoNul = BeforeValidator(_reject_nul)
