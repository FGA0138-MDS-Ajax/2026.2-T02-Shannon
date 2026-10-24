from fastapi.testclient import TestClient

from app.auth.models import User
from app.habits.models import HabitCategory


def test_habit_options_preselects_category_and_handles_others(
  client: TestClient,
  auth_headers: dict[str, str],
  habit_factory,
):
  # Verifica a pré-seleção para musculação e a exceção da categoria outros.
  habit_a = habit_factory(
    name="Musculação A",
    category=HabitCategory.MUSCULACAO,
  )
  habit_b = habit_factory(
    name="Musculação B",
    category=HabitCategory.MUSCULACAO,
  )
  habit_outros = habit_factory(
    name="Hábito sem categoria específica",
    category=HabitCategory.OUTROS,
  )

  response = client.get(
    "/check-ins/habit-options?category=musculacao",
    headers=auth_headers,
  )

  assert response.status_code == 200

  data = response.json()
  assert data["page"] == 1
  assert data["has_more"] is False

  items = data["items"]
  assert {item["id"] for item in items} == {
    str(habit_a.id),
    str(habit_b.id),
  }
  assert all(item["category"] == "musculacao" for item in items)
  assert all(item["preselected"] is True for item in items)

  response_outros = client.get(
    "/check-ins/habit-options?category=outros",
    headers=auth_headers,
  )

  assert response_outros.status_code == 200

  items_outros = response_outros.json()["items"]
  assert len(items_outros) == 1
  assert items_outros[0]["id"] == str(habit_outros.id)
  assert items_outros[0]["category"] == "outros"
  assert items_outros[0]["preselected"] is False


def test_habit_options_returns_only_eligible_habits(
  client: TestClient,
  auth_headers: dict[str, str],
  other_user: User,
  habit_factory,
):
  # Garante que hábitos encerrados ou de outros usuários não sejam listados.
  eligible_habit = habit_factory(
    name="Musculação ativa",
    category=HabitCategory.MUSCULACAO,
  )
  habit_factory(
    name="Musculação encerrada",
    category=HabitCategory.MUSCULACAO,
    finished=True,
  )
  habit_factory(
    author=other_user,
    is_public=True,
    name="Musculação pública de outra pessoa",
    category=HabitCategory.MUSCULACAO,
  )

  response = client.get(
    "/check-ins/habit-options?category=musculacao",
    headers=auth_headers,
  )

  assert response.status_code == 200

  items = response.json()["items"]

  assert len(items) == 1
  assert items[0]["id"] == str(eligible_habit.id)
  assert items[0]["name"] == "Musculação ativa"


def test_habit_options_paginates_without_repeating_items(
  client: TestClient,
  auth_headers: dict[str, str],
  habit_factory,
):
  # Verifica a paginação e garante que nenhum hábito seja repetido.
  habit_factory(name="Corrida A", category=HabitCategory.CORRIDA)
  habit_factory(name="Corrida B", category=HabitCategory.CORRIDA)
  habit_factory(name="Leitura", category=HabitCategory.LEITURA)
  habit_factory(name="Sono", category=HabitCategory.SONO)
  habit_factory(
    name="Musculação excluída",
    category=HabitCategory.MUSCULACAO,
  )

  response_page_1 = client.get(
    "/check-ins/habit-options?exclude_category=musculacao&page=1&page_size=3",
    headers=auth_headers,
  )
  response_page_2 = client.get(
    "/check-ins/habit-options?exclude_category=musculacao&page=2&page_size=3",
    headers=auth_headers,
  )

  assert response_page_1.status_code == 200
  assert response_page_2.status_code == 200

  page_1 = response_page_1.json()
  page_2 = response_page_2.json()

  assert page_1["page"] == 1
  assert len(page_1["items"]) == 3
  assert page_1["has_more"] is True

  assert page_2["page"] == 2
  assert len(page_2["items"]) == 1
  assert page_2["has_more"] is False

  ids_page_1 = {item["id"] for item in page_1["items"]}
  ids_page_2 = {item["id"] for item in page_2["items"]}

  assert ids_page_1.isdisjoint(ids_page_2)
  assert len(ids_page_1 | ids_page_2) == 4

  assert all(
    item["category"] != "musculacao" for item in page_1["items"] + page_2["items"]
  )


def test_categories_counts_only_eligible_habits(
  client: TestClient,
  auth_headers: dict[str, str],
  other_user: User,
  habit_factory,
):
  # Verifica as contagens, a ordenação e a exclusão de hábitos inelegíveis.
  habit_factory(name="Corrida A", category=HabitCategory.CORRIDA)
  habit_factory(name="Corrida B", category=HabitCategory.CORRIDA)
  habit_factory(name="Leitura", category=HabitCategory.LEITURA)
  habit_factory(name="Musculação", category=HabitCategory.MUSCULACAO)
  habit_factory(name="Outro", category=HabitCategory.OUTROS)
  habit_factory(
    name="Corrida encerrada",
    category=HabitCategory.CORRIDA,
    finished=True,
  )
  habit_factory(
    author=other_user,
    is_public=True,
    name="Corrida pública de outra pessoa",
    category=HabitCategory.CORRIDA,
  )

  response = client.get(
    "/check-ins/categories",
    headers=auth_headers,
  )

  assert response.status_code == 200
  assert response.json() == {
    "categories": [
      {"name": "corrida", "habit_count": 2},
      {"name": "leitura", "habit_count": 1},
      {"name": "musculacao", "habit_count": 1},
      {"name": "outros", "habit_count": 1},
    ]
  }
