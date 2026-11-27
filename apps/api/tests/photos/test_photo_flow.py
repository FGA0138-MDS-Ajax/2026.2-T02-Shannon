"""QA-1, cenários 9 a 16: o fluxo da foto de ponta a ponta (FOTO-3, 5, 6 e 7).

Usam o `FakeStorage` do `get_storage()` (`STORAGE_BACKEND=memory`), que a fixture
autouse do `conftest.py` esvazia entre os testes. Nenhum teste usa a rede.
"""

from datetime import UTC, datetime, timedelta
from io import BytesIO

from PIL import ExifTags, Image
from sqlmodel import Session

from app.checkins.exceptions import MSG_CHECK_IN_FORBIDDEN, MSG_CHECK_IN_NOT_FOUND
from app.group.models import Member
from app.habits.service import today
from app.photos.exceptions import (
  MSG_PHOTO_INVALID,
  MSG_PHOTO_NOT_TODAY,
  MSG_PHOTO_TOO_LARGE,
  MSG_PHOTO_UNSUPPORTED,
)
from app.photos.repository import get_photo
from app.photos.sweep import sweep_orphan_photos
from app.storage.dependencies import get_storage
from tests.conftest import _auth_headers, at_noon
from tests.group.fixtures import _add_member, _make_group, _make_group_habit


def _encode(image: Image.Image, fmt: str, **params) -> bytes:
  buffer = BytesIO()
  image.save(buffer, fmt, **params)
  return buffer.getvalue()


def _jpeg(size: tuple[int, int] = (100, 100), **params) -> bytes:
  return _encode(Image.new("RGB", size, (200, 30, 30)), "JPEG", **params)


def _file(content: bytes, name: str = "foto.jpg", mime: str = "image/jpeg") -> dict:
  return {"photo": (name, content, mime)}


def _put(client, headers, check_in_id, content: bytes, **kwargs):
  return client.put(
    f"/check-ins/{check_in_id}/photo", headers=headers, files=_file(content, **kwargs)
  )


def _photo_of(client, headers, check_in_id) -> dict | None:
  response = client.get(f"/check-ins/{check_in_id}", headers=headers)
  assert response.status_code == 200
  return response.json()["photo"]


# 9. Fluxo completo


def test_fluxo_completo_enviar_substituir_e_remover(
  client, auth_headers, habit_factory, check_in_factory
):
  storage = get_storage()
  check_in = check_in_factory(habit_factory())

  assert _put(client, auth_headers, check_in.id, _jpeg()).status_code == 200
  photo = _photo_of(client, auth_headers, check_in.id)
  assert photo["thumbnail_url"] and photo["url"]
  assert len(storage.objects) == 2

  assert _put(client, auth_headers, check_in.id, _jpeg((300, 200))).status_code == 200
  assert len(storage.objects) == 2  # a nova entrou e a antiga saiu

  response = client.delete(f"/check-ins/{check_in.id}/photo", headers=auth_headers)
  assert response.status_code == 204
  assert storage.objects == {}
  assert _photo_of(client, auth_headers, check_in.id) is None


# 10. Arquivos maliciosos pela rota


def _check_in_intacto(test_engine, check_in_id) -> None:
  with Session(test_engine) as session:
    assert get_photo(session, check_in_id) is None


def test_arquivos_maliciosos_nao_alteram_o_check_in(
  client, test_engine, auth_headers, habit_factory, check_in_factory
):
  storage = get_storage()
  check_in = check_in_factory(habit_factory())
  png_gigante = _encode(Image.new("1", (10_000, 10_000)), "PNG")

  texto = _put(client, auth_headers, check_in.id, b"<?php echo 1; ?>")
  assert (texto.status_code, texto.json()["detail"]) == (415, MSG_PHOTO_UNSUPPORTED)

  grande = _put(client, auth_headers, check_in.id, b"x" * (6 * 1024 * 1024))
  assert (grande.status_code, grande.json()["detail"]) == (413, MSG_PHOTO_TOO_LARGE)

  truncado = _put(client, auth_headers, check_in.id, _jpeg()[:80])
  assert (truncado.status_code, truncado.json()["detail"]) == (400, MSG_PHOTO_INVALID)

  bomba = _put(
    client, auth_headers, check_in.id, png_gigante, name="foto.png", mime="image/png"
  )
  assert bomba.status_code == 400

  assert storage.objects == {}
  _check_in_intacto(test_engine, check_in.id)


def test_jpeg_com_php_no_fim_e_aceito_sem_o_codigo(
  client, auth_headers, habit_factory, check_in_factory
):
  storage = get_storage()
  check_in = check_in_factory(habit_factory())

  response = _put(
    client, auth_headers, check_in.id, _jpeg() + b"<?php system($_GET['c']); ?>"
  )

  assert response.status_code == 200
  assert len(storage.objects) == 2
  for data in storage.objects.values():
    assert b"<?php" not in data


# 11. EXIF com GPS


def test_foto_com_gps_no_exif_e_gravada_sem_exif(
  client, auth_headers, habit_factory, check_in_factory
):
  storage = get_storage()
  exif = Image.Exif()
  gps = exif.get_ifd(ExifTags.IFD.GPSInfo)
  gps[ExifTags.GPS.GPSLatitudeRef] = "S"
  gps[ExifTags.GPS.GPSLatitude] = (15.0, 47.0, 0.0)
  data = _jpeg((640, 480), exif=exif)
  assert Image.open(BytesIO(data)).getexif().get_ifd(ExifTags.IFD.GPSInfo)
  check_in = check_in_factory(habit_factory())

  assert _put(client, auth_headers, check_in.id, data).status_code == 200

  assert len(storage.objects) == 2
  for stored in storage.objects.values():
    image = Image.open(BytesIO(stored))
    assert len(image.getexif()) == 0
    assert b"Exif" not in stored[:64]


# 12. Quem pode mexer na foto


def test_check_in_de_ontem_e_de_outros_usuarios(
  client, auth_headers, other_auth_headers, habit_factory, check_in_factory
):
  ontem = check_in_factory(
    habit_factory(), created_at=at_noon(today() - timedelta(days=1))
  )
  visivel = check_in_factory(habit_factory(is_public=True))
  invisivel = check_in_factory(habit_factory(is_public=False))

  de_ontem = _put(client, auth_headers, ontem.id, _jpeg())
  assert (de_ontem.status_code, de_ontem.json()["detail"]) == (409, MSG_PHOTO_NOT_TODAY)

  de_outro = _put(client, other_auth_headers, visivel.id, _jpeg())
  assert (de_outro.status_code, de_outro.json()["detail"]) == (
    403,
    MSG_CHECK_IN_FORBIDDEN,
  )

  escondido = _put(client, other_auth_headers, invisivel.id, _jpeg())
  assert (escondido.status_code, escondido.json()["detail"]) == (
    404,
    MSG_CHECK_IN_NOT_FOUND,
  )
  assert get_storage().objects == {}


# 13. Visibilidade


def test_visibilidade_autor_membro_habito_publico_e_quem_saiu(
  client,
  test_engine,
  user,
  other_user,
  auth_headers,
  habit_factory,
  check_in_factory,
):
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  _add_member(test_engine, group, other_user)
  misto = check_in_factory([habit_factory(), _make_group_habit(test_engine, group)])
  publico = habit_factory(is_public=True)
  do_habito_publico = check_in_factory(publico)
  assert _put(client, auth_headers, misto.id, _jpeg()).status_code == 200
  assert _put(client, auth_headers, do_habito_publico.id, _jpeg()).status_code == 200
  outro = _auth_headers(other_user)

  assert _photo_of(client, auth_headers, misto.id)["url"]  # autor
  assert _photo_of(client, outro, misto.id)["url"]  # membro, check-in misto
  assert _photo_of(client, outro, do_habito_publico.id) is None  # hábito público

  with Session(test_engine) as db:
    db.delete(db.get(Member, (group.id, other_user.id)))
    db.commit()
  assert client.get(f"/check-ins/{misto.id}", headers=outro).status_code == 404


# 14. Listas × detalhe


def test_listas_trazem_so_a_miniatura_e_o_detalhe_as_duas(
  client, test_engine, user, auth_headers, check_in_factory
):
  group = _make_group(test_engine)
  _add_member(test_engine, group, user)
  habit = _make_group_habit(test_engine, group)
  check_in = check_in_factory(habit, user=user)
  assert _put(client, auth_headers, check_in.id, _jpeg()).status_code == 200

  agrupada = client.get("/check-ins", headers=auth_headers).json()["items"][0]
  historico = client.get(f"/habits/{habit.id}/check-ins", headers=auth_headers).json()
  feed = client.get(f"/groups/{group.id}/check-ins", headers=auth_headers).json()[
    "items"
  ]
  listas = [
    next(iter(agrupada.values()))[0]["photo"],
    historico[0]["photo"],
    feed[0]["photo"],
  ]

  for photo in listas:
    assert photo["thumbnail_url"]
    assert photo["url"] is None
  assert _photo_of(client, auth_headers, check_in.id)["url"]


# 15. Exclusão do check-in


def test_excluir_check_in_apaga_os_objetos(
  client, auth_headers, habit_factory, check_in_factory
):
  check_in = check_in_factory(habit_factory())
  assert _put(client, auth_headers, check_in.id, _jpeg()).status_code == 200

  response = client.delete(f"/check-ins/{check_in.id}", headers=auth_headers)

  assert response.status_code == 204
  assert get_storage().objects == {}


def test_excluir_check_in_com_falha_no_bucket_deixa_os_objetos_para_o_varredor(
  client, test_engine, auth_headers, habit_factory, check_in_factory
):
  storage = get_storage()
  check_in = check_in_factory(habit_factory())
  assert _put(client, auth_headers, check_in.id, _jpeg()).status_code == 200
  storage.fail_on_delete = True

  response = client.delete(f"/check-ins/{check_in.id}", headers=auth_headers)

  assert response.status_code == 204
  assert len(storage.objects) == 2  # órfãos: o banco já não os conhece
  storage.fail_on_delete = False
  with Session(test_engine) as db:  # sessão fechada: senão o TRUNCATE final trava
    result = sweep_orphan_photos(db, storage, datetime.now(UTC) + timedelta(days=2))
  assert result.deleted == 2
  assert storage.objects == {}


# 16. Varredor


def test_varredor_apaga_so_o_orfao_antigo(
  client, test_engine, auth_headers, habit_factory, check_in_factory
):
  storage = get_storage()
  check_in = check_in_factory(habit_factory())
  assert _put(client, auth_headers, check_in.id, _jpeg()).status_code == 200
  registrados = set(storage.objects)
  storage.save("check-ins/orfao-antigo.jpg", b"a", "image/jpeg")
  storage.save("check-ins/orfao-recente.jpg", b"b", "image/jpeg")
  now = datetime.now(UTC)
  storage.set_last_modified("check-ins/orfao-antigo.jpg", now - timedelta(hours=25))
  for key in registrados:  # os registrados também são antigos, e mesmo assim ficam
    storage.set_last_modified(key, now - timedelta(days=3))

  with Session(test_engine) as db:
    result = sweep_orphan_photos(db, storage, now)

  assert (result.orphans, result.deleted) == (1, 1)
  assert set(storage.objects) == registrados | {"check-ins/orfao-recente.jpg"}


def test_varredor_em_dry_run_nao_apaga_nada(test_engine):
  storage = get_storage()
  storage.save("check-ins/orfao.jpg", b"a", "image/jpeg")
  storage.set_last_modified(
    "check-ins/orfao.jpg", datetime.now(UTC) - timedelta(days=2)
  )

  with Session(test_engine) as db:
    result = sweep_orphan_photos(db, storage, datetime.now(UTC), dry_run=True)

  assert (result.orphans, result.deleted) == (1, 0)
  assert "check-ins/orfao.jpg" in storage.objects
