import base64
from collections import defaultdict
from datetime import datetime
from uuid import UUID

from sqlmodel import Session

from app.auth.models import User
from app.group import repository
from app.group.exceptions import InvalidCursorError
from app.group.permissions import require_member
from app.group.schemas import FeedAuthor, FeedHabit, FeedItem, FeedPage, FeedQuery

_CURSOR_SEPARATOR = "|"


def encode_cursor(created_at: datetime, check_in_id: UUID) -> str:
  """Cursor opaco de um item do feed: base64 url-safe de `created_at|id`.

  Sai sem o `=` do final, só com `A-Z`, `a-z`, `0-9`, `-` e `_`, e pode ir na
  URL sem escape. O app só guarda e devolve o cursor, nunca o interpreta.
  """
  raw = f"{created_at.isoformat()}{_CURSOR_SEPARATOR}{check_in_id}"
  return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def decode_cursor(cursor: str) -> tuple[datetime, UUID]:
  """Inverso de `encode_cursor`: devolve `(created_at, id)`.

  Levanta `InvalidCursorError` para qualquer cursor malformado, para a rota
  responder 422 e nunca 500.
  """
  try:
    padded = cursor + "=" * (-len(cursor) % 4)
    # `validate=True` recusa caracteres fora do base64 em vez de ignorá-los.
    raw = base64.b64decode(padded.encode("ascii"), altchars=b"-_", validate=True)
    created_at, check_in_id = raw.decode().split(_CURSOR_SEPARATOR)
    return datetime.fromisoformat(created_at), UUID(check_in_id)
  except ValueError:
    # Cobre base64 inválido, texto que não é UTF-8, falta do separador, data e
    # UUID inválidos: todos são subclasses de `ValueError`.
    raise InvalidCursorError from None


def get_group_feed(
  db: Session, group_id: UUID, user: User, query: FeedQuery
) -> FeedPage:
  """Página do feed do grupo, do check-in mais novo ao mais antigo.

  Só membros leem, também com o grupo encerrado. Levanta `GroupNotFoundError`
  se o grupo não existe ou o usuário não é membro, e `InvalidCursorError` se o
  cursor for malformado. Cada item mostra só os hábitos do grupo.

  `next_cursor` vai no `before` da próxima página e é nulo quando não há mais
  itens. Com `after`, `has_more` diz que há ainda mais itens novos (chame de
  novo com o cursor do primeiro item) e `next_cursor` é nulo.

  Depois da permissão, faz 3 consultas (check-ins, hábitos e autores), seja
  qual for o número de itens. Página vazia faz só a primeira.
  """
  require_member(db, group_id, user)
  before = decode_cursor(query.before) if query.before is not None else None
  after = decode_cursor(query.after) if query.after is not None else None

  rows = repository.list_group_feed_check_ins(db, group_id, query.limit, before, after)
  has_more = len(rows) > query.limit
  check_ins = rows[: query.limit]
  if after is not None:
    check_ins.reverse()  # veio do mais antigo ao mais novo
  if not check_ins:
    return FeedPage(items=[], next_cursor=None, has_more=False)

  links = repository.list_feed_habit_links(
    db, [check_in.id for check_in in check_ins], group_id
  )
  authors = repository.list_authors(
    db, list({check_in.user_id for check_in in check_ins})
  )
  habits_by_check_in: dict[UUID, list[FeedHabit]] = defaultdict(list)
  for check_in_id, habit in links:
    habits_by_check_in[check_in_id].append(FeedHabit(id=habit.id, name=habit.name))

  items = [
    FeedItem(
      cursor=encode_cursor(check_in.created_at, check_in.id),
      id=check_in.id,
      author=FeedAuthor(
        id=check_in.user_id, username=authors[check_in.user_id].username
      ),
      title=check_in.title,
      description=check_in.description,
      habits=habits_by_check_in[check_in.id],
      created_at=check_in.created_at,
    )
    for check_in in check_ins
  ]
  next_cursor = items[-1].cursor if has_more and after is None else None
  return FeedPage(items=items, next_cursor=next_cursor, has_more=has_more)
