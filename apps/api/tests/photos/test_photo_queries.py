"""QA-1, seção 3: número de consultas e tempo do envio da foto.

Nunca comparamos com um número fixo, só um cenário pequeno com um grande (a única
exceção é o limite de 3 consultas do perfil, definido na própria issue).
"""

import os
import time
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import date
from io import BytesIO

from PIL import Image
from sqlalchemy import Engine, event

from tests.conftest import _auth_headers, _create_user, at_noon
from tests.group.fixtures import TODAY, _add_member, _make_group, _make_group_habit
from tests.photos.test_photo_in_responses import _add_photo


@contextmanager
def _count_queries(engine: Engine) -> Iterator[list[str]]:
  statements: list[str] = []

  def before_execute(conn, cursor, statement, *args) -> None:
    statements.append(statement)

  event.listen(engine, "before_cursor_execute", before_execute)
  try:
    yield statements
  finally:
    event.remove(engine, "before_cursor_execute", before_execute)


def _queries(client, engine: Engine, url: str, headers) -> int:
  with _count_queries(engine) as statements:
    response = client.get(url, headers=headers)
  assert response.status_code == 200, response.text
  return len(statements)


def test_lista_de_check_ins_faz_as_mesmas_consultas_com_1_e_com_30_fotos(
  client, test_engine, habit_factory, check_in_factory
):
  def usuario_com(quantidade: int, prefixo: str) -> dict[str, str]:
    pessoa = _create_user(test_engine, prefixo)
    habit = habit_factory(author=pessoa)
    for _ in range(quantidade):
      _add_photo(test_engine, check_in_factory(habit).id)
    return _auth_headers(pessoa)

  um, trinta = usuario_com(1, "um"), usuario_com(30, "trinta")

  assert _queries(client, test_engine, "/check-ins", um) == _queries(
    client, test_engine, "/check-ins", trinta
  )


def test_feed_com_fotos_faz_no_maximo_uma_consulta_a_mais(
  client, test_engine, user, auth_headers, check_in_factory, freeze_today
):
  freeze_today(TODAY)

  def grupo_com(fotos: bool):
    group = _make_group(test_engine)
    _add_member(test_engine, group, user)
    habit = _make_group_habit(test_engine, group)
    for day in range(1, 6):
      check_in = check_in_factory(
        habit, user=user, created_at=at_noon(date(2026, 11, day))
      )
      if fotos:
        _add_photo(test_engine, check_in.id)
    return f"/groups/{group.id}/check-ins"

  sem_fotos = _queries(client, test_engine, grupo_com(False), auth_headers)
  com_fotos = _queries(client, test_engine, grupo_com(True), auth_headers)

  assert com_fotos <= sem_fotos + 1


def test_perfil_faz_no_maximo_3_consultas(
  client, test_engine, auth_headers, habit_factory, check_in_factory
):
  habit = habit_factory()
  for _ in range(5):
    check_in_factory(habit)

  assert _queries(client, test_engine, "/user/statistics/profile", auth_headers) <= 3


def test_tempo_do_put_de_uma_foto_de_3_mb_e_so_registrado(
  client, auth_headers, habit_factory, check_in_factory
):
  """Sem critério de corte: o tempo depende da máquina. Veja com `pytest -s`."""
  ruido = Image.frombytes("RGB", (1400, 1050), os.urandom(1400 * 1050 * 3))
  buffer = BytesIO()
  ruido.save(buffer, "JPEG", quality=95, subsampling=0)
  foto = buffer.getvalue()
  assert 2 * 1024 * 1024 <= len(foto) <= 5 * 1024 * 1024
  check_in = check_in_factory(habit_factory())

  inicio = time.perf_counter()
  response = client.put(
    f"/check-ins/{check_in.id}/photo",
    headers=auth_headers,
    files={"photo": ("foto.jpg", foto, "image/jpeg")},
  )
  decorrido = time.perf_counter() - inicio

  assert response.status_code == 200
  print(f"\nPUT de {len(foto) / 1024 / 1024:.1f} MB: {decorrido * 1000:.0f} ms")
