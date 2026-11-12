from datetime import timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.auth.models import User
from app.auth.tokens import create_access_token
from app.group import repository
from app.group.models import (
  GROUP_MAX_MEMBERS,
  Group,
  GroupRole,
  Member,
  RankingCriterion,
)
from app.habits import service as habits_service


def _auth_headers_for(user: User) -> dict[str, str]:
  token, _ = create_access_token(str(user.id))
  return {"Authorization": f"Bearer {token}"}


def test_add_and_list_members(
  client: TestClient,
  auth_headers: dict[str, str],
  user: User,
  other_user: User,
  test_engine,
) -> None:
  today = habits_service.today()

  with Session(test_engine) as session:
    group = Group(
      name="Grupo Teste",
      starts_on=today,
      ranking_criterion=RankingCriterion.CHECK_INS,
      invite_code="MEMB0001",
    )
    session.add(group)
    session.flush()
    repository.add_member(
      session,
      Member(group_id=group.id, user_id=user.id, role=GroupRole.ADMIN.value),
    )
    session.commit()
    group_id = group.id

  # 1. Sucesso ao adicionar por username
  res = client.post(
    f"/groups/{group_id}/members",
    json={"username": other_user.username.upper()},
    headers=auth_headers,
  )
  assert res.status_code == 201
  data = res.json()
  assert data["user_id"] == str(other_user.id)
  assert data["role"] == "member"

  # 2. Tentar adicionar novamente -> 409 Já participa
  res_dup = client.post(
    f"/groups/{group_id}/members",
    json={"username": other_user.username},
    headers=auth_headers,
  )
  assert res_dup.status_code == 409

  # 3. Usuário inexistente -> 404
  res_not_found = client.post(
    f"/groups/{group_id}/members",
    json={"username": "nao_existe_123"},
    headers=auth_headers,
  )
  assert res_not_found.status_code == 404

  # 4. Listar membros -> 200
  res_list = client.get(f"/groups/{group_id}/members", headers=auth_headers)
  assert res_list.status_code == 200
  members = res_list.json()
  assert len(members) == 2


def test_add_member_fails_when_group_ended_or_full(
  client: TestClient,
  auth_headers: dict[str, str],
  user: User,
  other_user: User,
  test_engine,
) -> None:
  today = habits_service.today()

  # Grupo encerrado
  with Session(test_engine) as session:
    g_ended = Group(
      name="Encerrado",
      starts_on=today - timedelta(days=5),
      ends_on=today - timedelta(days=1),
      ranking_criterion=RankingCriterion.CHECK_INS,
      invite_code="ENDED001",
    )
    session.add(g_ended)
    session.flush()
    repository.add_member(
      session,
      Member(group_id=g_ended.id, user_id=user.id, role=GroupRole.ADMIN.value),
    )
    session.commit()
    g_ended_id = g_ended.id

  res_ended = client.post(
    f"/groups/{g_ended_id}/members",
    json={"username": other_user.username},
    headers=auth_headers,
  )
  assert res_ended.status_code == 409
  assert res_ended.json()["detail"] == "Grupo encerrado."

  # Grupo cheio
  with Session(test_engine) as session:
    g_full = Group(
      name="Cheio",
      starts_on=today,
      ranking_criterion=RankingCriterion.CHECK_INS,
      invite_code="FULL0001",
    )
    session.add(g_full)
    session.flush()
    repository.add_member(
      session,
      Member(group_id=g_full.id, user_id=user.id, role=GroupRole.ADMIN.value),
    )
    for i in range(GROUP_MAX_MEMBERS - 1):
      dummy = User(
        name=f"Dummy {i}",
        username=f"dummy_{i}_{uuid4().hex[:6]}",
        email=f"dummy_{i}_{uuid4().hex[:6]}@test.com",
        password_hash="hash",
      )
      session.add(dummy)
      session.flush()
      repository.add_member(
        session,
        Member(group_id=g_full.id, user_id=dummy.id, role=GroupRole.MEMBER.value),
      )
    session.commit()
    g_full_id = g_full.id

  res_full = client.post(
    f"/groups/{g_full_id}/members",
    json={"username": other_user.username},
    headers=auth_headers,
  )
  assert res_full.status_code == 409
  assert res_full.json()["detail"] == "Grupo cheio."


def test_promote_and_remove_member(
  client: TestClient,
  auth_headers: dict[str, str],
  user: User,
  other_user: User,
  test_engine,
) -> None:
  today = habits_service.today()

  with Session(test_engine) as session:
    group = Group(
      name="Grupo Gestao",
      starts_on=today,
      ranking_criterion=RankingCriterion.CHECK_INS,
      invite_code="GEST0001",
    )
    session.add(group)
    session.flush()
    repository.add_member(
      session,
      Member(group_id=group.id, user_id=user.id, role=GroupRole.ADMIN.value),
    )
    repository.add_member(
      session,
      Member(group_id=group.id, user_id=other_user.id, role=GroupRole.MEMBER.value),
    )
    session.commit()
    group_id = group.id

  # 1. Promover membro -> 200
  res_promote = client.post(
    f"/groups/{group_id}/members/{other_user.id}/promote",
    headers=auth_headers,
  )
  assert res_promote.status_code == 200
  assert res_promote.json()["role"] == "admin"

  # 2. Promover novamente -> 409
  res_repromote = client.post(
    f"/groups/{group_id}/members/{other_user.id}/promote",
    headers=auth_headers,
  )
  assert res_repromote.status_code == 409

  # 3. Remover a si mesmo -> 409
  res_self = client.delete(
    f"/groups/{group_id}/members/{user.id}",
    headers=auth_headers,
  )
  assert res_self.status_code == 409

  # 4. Admin remove outro admin -> 204
  res_del = client.delete(
    f"/groups/{group_id}/members/{other_user.id}",
    headers=auth_headers,
  )
  assert res_del.status_code == 204


def test_leave_group_scenarios(
  client: TestClient,
  auth_headers: dict[str, str],
  user: User,
  other_user: User,
  test_engine,
) -> None:
  today = habits_service.today()

  # Cenário A: Admin sai, sendo único admin, e outro membro vira admin
  with Session(test_engine) as session:
    g_a = Group(
      name="Grupo Sucessao",
      starts_on=today,
      ranking_criterion=RankingCriterion.CHECK_INS,
      invite_code="SUCC0001",
    )
    session.add(g_a)
    session.flush()
    repository.add_member(
      session,
      Member(group_id=g_a.id, user_id=user.id, role=GroupRole.ADMIN.value),
    )
    repository.add_member(
      session,
      Member(group_id=g_a.id, user_id=other_user.id, role=GroupRole.MEMBER.value),
    )
    session.commit()
    g_a_id = g_a.id

  res_leave_succ = client.post(f"/groups/{g_a_id}/leave", headers=auth_headers)
  assert res_leave_succ.status_code == 200
  assert res_leave_succ.json() == {
    "group_deleted": False,
    "promoted_user_id": str(other_user.id),
  }

  # Cenário B: Último integrante sai -> grupo excluído
  other_headers = _auth_headers_for(other_user)
  res_leave_last = client.post(f"/groups/{g_a_id}/leave", headers=other_headers)
  assert res_leave_last.status_code == 200
  assert res_leave_last.json() == {
    "group_deleted": True,
    "promoted_user_id": None,
  }

  # Conferir se o grupo não existe mais
  assert client.get(f"/groups/{g_a_id}", headers=other_headers).status_code == 404
