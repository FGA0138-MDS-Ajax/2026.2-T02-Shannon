from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.auth.models import User
from app.group import repository
from app.group.models import Group, GroupRole, Member, RankingCriterion
from app.habits import service as habits_service


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

  response = client.post("/groups", json=payload, headers=auth_headers)
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

  response = client.get("/groups", headers=auth_headers)
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
  assert client.get("/groups").status_code == 401
  assert client.post("/groups", json={}).status_code == 401
  assert client.get(f"/groups/{group_id}").status_code == 401
