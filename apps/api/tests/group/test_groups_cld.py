from datetime import UTC, date, datetime, timedelta
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.auth.models import User
from app.group import groups as groups_module
from app.group import repository
from app.group.models import Group, GroupRole, Member, RankingCriterion
from app.group.schemas import GroupCreate
from app.habits import service as habits_service
from app.main import app


def test_create_group_defaults_starts_on_to_today(
  client: TestClient,
  auth_headers: dict[str, str],
) -> None:
  today = habits_service.today()
  payload = {
    "name": "Grupo de Teste",
    "description": "Descrição opcional",
    "ranking_criterion": "goals",
  }

  response = client.post(
    "/groups",
    json=payload,
    headers=auth_headers,
    follow_redirects=False,
  )
  assert response.status_code == 201

  data = response.json()
  assert data["name"] == "Grupo de Teste"
  assert data["description"] == "Descrição opcional"
  assert data["ranking_criterion"] == "goals"
  assert data["starts_on"] == today.isoformat()
  assert data["ends_on"] is None
  assert data["status"] == "active"
  assert data["members_count"] == 1
  assert data["my_role"] == "admin"
  assert data["invite_code"] is not None
  assert len(data["invite_code"]) == 8
  assert len(data["members"]) == 1
  assert data["members"][0]["role"] == "admin"


def test_create_group_validates_ends_on_and_criterion(
  client: TestClient,
  auth_headers: dict[str, str],
) -> None:
  today = habits_service.today()

  # 1. ends_on anterior a starts_on no payload -> 422 (validação de schema)
  response = client.post(
    "/groups",
    json={
      "name": "Grupo Inválido",
      "starts_on": (today + timedelta(days=10)).isoformat(),
      "ends_on": (today + timedelta(days=5)).isoformat(),
      "ranking_criterion": "check_ins",
    },
    headers=auth_headers,
  )
  assert response.status_code == 422

  # 2. ends_on anterior a hoje -> 422 (validação de service)
  response = client.post(
    "/groups",
    json={
      "name": "Grupo Ontem",
      "ends_on": (today - timedelta(days=1)).isoformat(),
      "ranking_criterion": "check_ins",
    },
    headers=auth_headers,
  )
  assert response.status_code == 422

  # 3. ranking_criterion inválido -> 422
  response = client.post(
    "/groups",
    json={
      "name": "Grupo Critério",
      "ranking_criterion": "invalido",
    },
    headers=auth_headers,
  )
  assert response.status_code == 422


def test_list_groups_sorting_and_counts(
  client: TestClient,
  auth_headers: dict[str, str],
  user: User,
  other_user: User,
  test_engine,
) -> None:
  today = habits_service.today()

  with Session(test_engine) as session:
    g_active_old = Group(
      name="Ativo Antigo",
      starts_on=today,
      ranking_criterion=RankingCriterion.CHECK_INS,
      invite_code="CODE0001",
      created_at=datetime(2026, 11, 1, 10, 0, tzinfo=UTC),
    )
    g_active_new = Group(
      name="Ativo Novo",
      starts_on=today,
      ranking_criterion=RankingCriterion.GOALS,
      invite_code="CODE0002",
      created_at=datetime(2026, 11, 2, 10, 0, tzinfo=UTC),
    )
    g_ended = Group(
      name="Encerrado",
      starts_on=today - timedelta(days=10),
      ends_on=today - timedelta(days=1),
      ranking_criterion=RankingCriterion.CHECK_INS,
      invite_code="CODE0003",
      created_at=datetime(2026, 11, 3, 10, 0, tzinfo=UTC),
    )
    session.add_all([g_active_old, g_active_new, g_ended])
    session.flush()

    repository.add_member(
      session,
      Member(group_id=g_active_old.id, user_id=user.id, role=GroupRole.ADMIN),
    )
    repository.add_member(
      session,
      Member(group_id=g_active_new.id, user_id=user.id, role=GroupRole.MEMBER),
    )
    repository.add_member(
      session,
      Member(group_id=g_active_new.id, user_id=other_user.id, role=GroupRole.ADMIN),
    )
    repository.add_member(
      session,
      Member(group_id=g_ended.id, user_id=user.id, role=GroupRole.ADMIN),
    )
    session.commit()

  response = client.get("/groups", headers=auth_headers, follow_redirects=False)
  assert response.status_code == 200

  items = response.json()
  assert len(items) == 3

  # Ordem esperada: ativos primeiro (mais recente para mais antigo), depois encerrados
  assert items[0]["name"] == "Ativo Novo"
  assert items[0]["status"] == "active"
  assert items[0]["members_count"] == 2
  assert items[0]["my_role"] == "member"

  assert items[1]["name"] == "Ativo Antigo"
  assert items[1]["status"] == "active"
  assert items[1]["members_count"] == 1
  assert items[1]["my_role"] == "admin"

  assert items[2]["name"] == "Encerrado"
  assert items[2]["status"] == "ended"
  assert items[2]["members_count"] == 1


def test_get_group_detail_permissions_and_invite_code(
  client: TestClient,
  auth_headers: dict[str, str],
  other_auth_headers: dict[str, str],
  user: User,
  other_user: User,
  test_engine,
) -> None:
  today = habits_service.today()

  with Session(test_engine) as session:
    group = Group(
      name="Grupo Secreto",
      starts_on=today,
      ranking_criterion=RankingCriterion.CHECK_INS,
      invite_code="SECRET88",
    )
    session.add(group)
    session.flush()

    repository.add_member(
      session,
      Member(group_id=group.id, user_id=user.id, role=GroupRole.ADMIN),
    )
    repository.add_member(
      session,
      Member(group_id=group.id, user_id=other_user.id, role=GroupRole.MEMBER),
    )
    session.commit()
    group_id = group.id

  # 1. Admin vê o invite_code
  resp_admin = client.get(f"/groups/{group_id}", headers=auth_headers)
  assert resp_admin.status_code == 200
  data_admin = resp_admin.json()
  assert data_admin["my_role"] == "admin"
  assert data_admin["invite_code"] == "SECRET88"
  assert data_admin["members_count"] == 2
  assert len(data_admin["members"]) == 2

  # 2. Membro comum vê invite_code como None
  resp_member = client.get(f"/groups/{group_id}", headers=other_auth_headers)
  assert resp_member.status_code == 200
  data_member = resp_member.json()
  assert data_member["my_role"] == "member"
  assert data_member["invite_code"] is None

  # 3. Não membro vê 404
  with Session(test_engine) as session:
    from app.auth.tokens import create_access_token

    outsider = User(
      name="Outsider",
      username="outsider_123",
      email="outsider@teste.com",
      password_hash="hash",
    )
    session.add(outsider)
    session.commit()
    token, _ = create_access_token(str(outsider.id))
    outsider_headers = {"Authorization": f"Bearer {token}"}

  resp_outsider = client.get(f"/groups/{group_id}", headers=outsider_headers)
  assert resp_outsider.status_code == 404
  assert resp_outsider.json()["detail"] == "Grupo não encontrado."

  # 4. ID que não é UUID retorna 422
  resp_bad_id = client.get("/groups/nao-e-uuid", headers=auth_headers)
  assert resp_bad_id.status_code == 422

  # 5. Sem autenticação retorna 401
  assert client.get("/groups", follow_redirects=False).status_code == 401
  assert client.post("/groups", json={}, follow_redirects=False).status_code == 401
  assert client.get(f"/groups/{group_id}").status_code == 401

  # 6. Grupo inexistente retorna 404
  resp_missing = client.get(f"/groups/{uuid4()}", headers=auth_headers)
  assert resp_missing.status_code == 404
  assert resp_missing.json()["detail"] == "Grupo não encontrado."


def test_list_groups_empty_and_tiebreak_by_name(
  client: TestClient,
  auth_headers: dict[str, str],
  user: User,
  test_engine,
) -> None:
  resp_empty = client.get("/groups", headers=auth_headers, follow_redirects=False)
  assert resp_empty.status_code == 200
  assert resp_empty.json() == []

  today = habits_service.today()
  same_ts = datetime(2026, 11, 10, 12, 0, tzinfo=UTC)

  with Session(test_engine) as session:
    g_b = Group(
      name="Beta",
      starts_on=today,
      ends_on=today,
      ranking_criterion=RankingCriterion.CHECK_INS,
      invite_code="TIE00002",
      created_at=same_ts,
    )
    g_a = Group(
      name="Alpha",
      starts_on=today,
      ranking_criterion=RankingCriterion.GOALS,
      invite_code="TIE00001",
      created_at=same_ts,
    )
    session.add_all([g_b, g_a])
    session.flush()
    repository.add_member(
      session, Member(group_id=g_b.id, user_id=user.id, role=GroupRole.ADMIN)
    )
    repository.add_member(
      session, Member(group_id=g_a.id, user_id=user.id, role=GroupRole.ADMIN)
    )
    session.commit()

  resp = client.get("/groups", headers=auth_headers, follow_redirects=False)
  assert resp.status_code == 200
  items = resp.json()
  assert [item["name"] for item in items] == ["Alpha", "Beta"]
  assert all(item["status"] == "active" for item in items)


def test_create_group_invite_collision_retries_and_exhaustion(
  test_engine,
  user: User,
) -> None:
  with Session(test_engine) as session:
    session.add(
      Group(
        name="Existente",
        starts_on=date(2026, 11, 11),
        ranking_criterion=RankingCriterion.GOALS,
        invite_code="DUPCODE1",
      )
    )
    session.commit()

    db_user = session.get(User, user.id)
    assert db_user is not None

    with patch(
      "app.group.groups.generate_invite_code",
      side_effect=["DUPCODE1", "DUPCODE1", "DUPCODE1", "DUPCODE1", "UNIQ9999"],
    ):
      created = groups_module.service_create_group(
        session,
        db_user,
        GroupCreate(name="Recuperado", ranking_criterion=RankingCriterion.GOALS),
      )
    assert created.invite_code == "UNIQ9999"

    with (
      patch("app.group.groups.generate_invite_code", return_value="DUPCODE1"),
      pytest.raises(HTTPException) as exc_info,
    ):
      groups_module.service_create_group(
        session,
        db_user,
        GroupCreate(name="Falha", ranking_criterion=RankingCriterion.GOALS),
      )
    assert exc_info.value.status_code == 500


def test_groups_openapi_paths_and_examples() -> None:
  paths = app.openapi()["paths"]
  assert "/groups" in paths
  assert "/groups/{group_id}" in paths

  post_responses = paths["/groups"]["post"]["responses"]
  assert "example" in post_responses["201"]["content"]["application/json"]
  assert "401" in post_responses
  assert len(post_responses["422"]["content"]["application/json"]["examples"]) >= 2

  list_responses = paths["/groups"]["get"]["responses"]
  assert "example" in list_responses["200"]["content"]["application/json"]
  assert "401" in list_responses

  detail_responses = paths["/groups/{group_id}"]["get"]["responses"]
  assert "example" in detail_responses["200"]["content"]["application/json"]
  assert "401" in detail_responses
  assert "404" in detail_responses
  assert "422" in detail_responses
