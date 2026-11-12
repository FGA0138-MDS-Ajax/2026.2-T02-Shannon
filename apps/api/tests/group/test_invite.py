from datetime import timedelta
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.auth.models import User
from app.auth.tokens import create_access_token
from app.group import invite, repository
from app.group.models import (
  GROUP_MAX_MEMBERS,
  Group,
  GroupRole,
  Member,
  RankingCriterion,
)
from app.habits import service as habits_service


def _auth_headers_for(user: User) -> dict[str, str]:
  """Gera o cabeçalho de autenticação de um usuário."""
  token, _ = create_access_token(str(user.id))
  return {"Authorization": f"Bearer {token}"}


def _create_group(
  test_engine,
  user: User,
  invite_code: str,
  name: str = "Grupo Convite",
  ends_on=None,
) -> str:
  """Cria um grupo com o usuário informado como administrador."""
  # O início deve ser anterior ao encerramento para respeitar a restrição do banco.
  starts_on = ends_on - timedelta(days=1) if ends_on else habits_service.today()

  with Session(test_engine) as session:
    group = Group(
      name=name,
      starts_on=starts_on,
      ends_on=ends_on,
      ranking_criterion=RankingCriterion.CHECK_INS,
      invite_code=invite_code,
    )
    session.add(group)
    session.flush()

    repository.add_member(
      session,
      Member(
        group_id=group.id,
        user_id=user.id,
        role=GroupRole.ADMIN.value,
      ),
    )
    session.commit()
    return str(group.id)


def test_preview_group_by_invite_code(
  client: TestClient,
  user: User,
  auth_headers: dict[str, str],
  test_engine,
) -> None:
  """Pré-visualiza um grupo sem expor seu código ou seus integrantes."""
  group_id = _create_group(test_engine, user, "PREV0001")

  response = client.get(
    "/groups/invite/prev-0001",
    headers=auth_headers,
  )

  assert response.status_code == 200
  data = response.json()
  assert data["id"] == group_id
  assert data["name"] == "Grupo Convite"
  assert data["members_count"] == 1
  assert data["status"] == "active"
  assert "invite_code" not in data
  assert "members" not in data


def test_preview_invalid_invite_code(
  client: TestClient,
  auth_headers: dict[str, str],
) -> None:
  """Retorna 404 quando o código de convite não existe."""
  response = client.get(
    "/groups/invite/INVALID1",
    headers=auth_headers,
  )

  assert response.status_code == 404
  assert response.json()["detail"] == "Código de convite inválido."


def test_join_group_by_invite_code(
  client: TestClient,
  user: User,
  other_user: User,
  test_engine,
) -> None:
  """Permite entrar por convite e retorna os detalhes do grupo."""
  group_id = _create_group(test_engine, user, "JOIN0001")

  response = client.post(
    "/groups/join",
    json={"code": "join- 0001"},
    headers=_auth_headers_for(other_user),
  )

  assert response.status_code == 201
  data = response.json()
  assert data["id"] == group_id
  assert data["my_role"] == "member"
  assert data["invite_code"] is None
  assert data["members_count"] == 2
  assert len(data["members"]) == 2


def test_join_group_with_invalid_code(
  client: TestClient,
  auth_headers: dict[str, str],
) -> None:
  """Retorna 404 ao tentar entrar com um código inválido."""
  response = client.post(
    "/groups/join",
    json={"code": "INVALID1"},
    headers=auth_headers,
  )

  assert response.status_code == 404
  assert response.json()["detail"] == "Código de convite inválido."


def test_join_group_when_already_member(
  client: TestClient,
  user: User,
  auth_headers: dict[str, str],
  test_engine,
) -> None:
  """Retorna 409 quando o usuário já participa do grupo."""
  _create_group(test_engine, user, "DUPL0001")

  response = client.post(
    "/groups/join",
    json={"code": "DUPL0001"},
    headers=auth_headers,
  )

  assert response.status_code == 409
  assert response.json()["detail"] == "Você já participa deste grupo."


def test_join_group_when_group_ended(
  client: TestClient,
  user: User,
  other_user: User,
  test_engine,
) -> None:
  """Retorna 409 quando o grupo já encerrou."""
  today = habits_service.today()
  _create_group(
    test_engine,
    user,
    "ENDD0001",
    name="Grupo Encerrado",
    ends_on=today - timedelta(days=1),
  )

  response = client.post(
    "/groups/join",
    json={"code": "ENDD0001"},
    headers=_auth_headers_for(other_user),
  )

  assert response.status_code == 409
  assert response.json()["detail"] == "Grupo encerrado."


def test_join_group_when_group_is_full(
  client: TestClient,
  user: User,
  other_user: User,
  test_engine,
) -> None:
  """Retorna 409 quando o grupo já atingiu o limite de integrantes."""
  group_id = _create_group(test_engine, user, "FULL0001")

  with Session(test_engine) as session:
    for i in range(GROUP_MAX_MEMBERS - 1):
      unique_id = uuid4().hex[:8]
      dummy = User(
        name=f"Dummy {i}",
        username=f"invite_dummy_{unique_id}",
        email=f"invite_dummy_{unique_id}@test.com",
        password_hash="hash",
      )
      session.add(dummy)
      session.flush()

      repository.add_member(
        session,
        Member(
          group_id=UUID(group_id),
          user_id=dummy.id,
          role=GroupRole.MEMBER.value,
        ),
      )

    session.commit()

  response = client.post(
    "/groups/join",
    json={"code": "FULL0001"},
    headers=_auth_headers_for(other_user),
  )

  assert response.status_code == 409
  assert response.json()["detail"] == "Grupo cheio."


def test_regenerate_invite_code(
  client: TestClient,
  user: User,
  auth_headers: dict[str, str],
  test_engine,
) -> None:
  """Renova o código e invalida imediatamente o código anterior."""
  group_id = _create_group(test_engine, user, "OLD00001")

  response = client.post(
    f"/groups/{group_id}/invite/regenerate",
    headers=auth_headers,
  )

  assert response.status_code == 200
  new_code = response.json()["invite_code"]
  assert len(new_code) == 8
  assert new_code != "OLD00001"

  old_preview = client.get(
    "/groups/invite/OLD00001",
    headers=auth_headers,
  )
  assert old_preview.status_code == 404

  new_preview = client.get(
    f"/groups/invite/{new_code}",
    headers=auth_headers,
  )
  assert new_preview.status_code == 200


def test_regenerate_invite_code_forbidden(
  client: TestClient,
  user: User,
  other_user: User,
  test_engine,
) -> None:
  """Impede que um membro comum renove o código."""
  group_id = _create_group(test_engine, user, "FORB0001")

  with Session(test_engine) as session:
    repository.add_member(
      session,
      Member(
        group_id=UUID(group_id),
        user_id=other_user.id,
        role=GroupRole.MEMBER.value,
      ),
    )
    session.commit()

  response = client.post(
    f"/groups/{group_id}/invite/regenerate",
    headers=_auth_headers_for(other_user),
  )

  assert response.status_code == 403


def test_invite_routes_require_authentication(
  client: TestClient,
  user: User,
  test_engine,
) -> None:
  """Exige autenticação nos três endpoints de convite."""
  group_id = _create_group(test_engine, user, "AUTH0001")

  join_response = client.post(
    "/groups/join",
    json={"code": "AUTH0001"},
  )
  preview_response = client.get("/groups/invite/AUTH0001")
  regenerate_response = client.post(
    f"/groups/{group_id}/invite/regenerate",
  )

  assert join_response.status_code == 401
  assert preview_response.status_code == 401
  assert regenerate_response.status_code == 401


def test_regenerate_invite_code_retries_on_collision(
  client: TestClient,
  user: User,
  auth_headers: dict[str, str],
  test_engine,
  monkeypatch,
) -> None:
  """Tenta outro código quando o primeiro já pertence a um grupo."""
  group_id = _create_group(test_engine, user, "OLD00001")
  _create_group(test_engine, user, "TAKEN001", name="Outro Grupo")

  generated_codes = iter(["TAKEN001", "NEW00001"])
  monkeypatch.setattr(
    invite,
    "generate_invite_code",
    lambda: next(generated_codes),
  )

  response = client.post(
    f"/groups/{group_id}/invite/regenerate",
    headers=auth_headers,
  )

  assert response.status_code == 200
  assert response.json()["invite_code"] == "NEW00001"


def test_regenerate_invite_code_fails_after_max_attempts(
  client: TestClient,
  user: User,
  auth_headers: dict[str, str],
  test_engine,
  monkeypatch,
) -> None:
  """Retorna 500 quando todas as tentativas geram códigos já utilizados."""
  group_id = _create_group(test_engine, user, "OLD00001")
  _create_group(test_engine, user, "TAKEN001", name="Outro Grupo")

  monkeypatch.setattr(
    invite,
    "generate_invite_code",
    lambda: "TAKEN001",
  )

  response = client.post(
    f"/groups/{group_id}/invite/regenerate",
    headers=auth_headers,
  )

  assert response.status_code == 500
  assert response.json()["detail"] == (
    "Não foi possível gerar um código de convite único. Tente novamente."
  )

  old_preview = client.get(
    "/groups/invite/OLD00001",
    headers=auth_headers,
  )
  assert old_preview.status_code == 200
