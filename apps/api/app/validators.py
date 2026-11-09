from pydantic import BeforeValidator

MSG_NUL_CHARACTER = "O texto não pode conter o caractere nulo."


def _reject_nul(value: object) -> object:
  """Recusa texto com o caractere NUL (`\\x00`), que o PostgreSQL não grava.

  Sem esta checagem, o erro só aparece no banco e a API responde 500.
  """
  if isinstance(value, str) and "\x00" in value:
    raise ValueError(MSG_NUL_CHARACTER)
  return value


# Uso: `Annotated[str, StringConstraints(...), NoNul]` em todo campo de texto que
# chega ao banco. Fica depois do `StringConstraints`: antes dele, o Pydantic
# confere o `min_length` antes de tirar os espaços e aceita `"   "` como `""`.
NoNul = BeforeValidator(_reject_nul)
