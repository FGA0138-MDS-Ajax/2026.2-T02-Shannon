"""GRP-10 (seção 6): o Swagger dos hábitos descreve os hábitos de grupo."""

from collections.abc import Iterator

import pytest
from pydantic import TypeAdapter

from app.habits.exceptions import MSG_GROUP_HABIT_FORBIDDEN, MSG_HABIT_FORBIDDEN
from app.habits.responses import RESPONSES_GET_BY_ID, RESPONSES_LIST
from app.habits.schemas import HabitPublic, HabitWithProgress
from app.main import app


@pytest.fixture(autouse=True)
def run_before() -> Iterator[None]:
  """Só lê o OpenAPI: não precisa de banco. Substitui o `run_before` raiz."""
  yield


def _json_content(response: dict) -> dict:
  return response["content"]["application/json"]


def test_list_example_matches_the_response_schema():
  example = _json_content(RESPONSES_LIST[200])["example"]

  items = TypeAdapter(list[HabitWithProgress]).validate_python(example)

  group_item, personal_item = items
  assert group_item.group is not None and group_item.author_user_id is None
  assert personal_item.group is None and personal_item.author_user_id is not None
  assert group_item.progress is not None and personal_item.progress is not None


def test_get_by_id_examples_match_the_response_schema():
  examples = _json_content(RESPONSES_GET_BY_ID[200])["examples"]

  group_habit = HabitPublic.model_validate(examples["habito_de_grupo"]["value"])
  personal_habit = HabitPublic.model_validate(examples["habito_pessoal"]["value"])

  assert group_habit.group is not None
  assert personal_habit.group is None


def test_openapi_documents_group_habits_on_personal_routes():
  paths = app.openapi()["paths"]

  list_get = paths["/habits"]["get"]["responses"]
  assert "example" in list_get["200"]["content"]["application/json"]
  assert "422" in list_get

  by_id = paths["/habits/{habit_id}"]["get"]["responses"]
  assert set(by_id["200"]["content"]["application/json"]["examples"]) == {
    "habito_pessoal",
    "habito_de_grupo",
  }
  assert "grupo" in by_id["404"]["description"]


@pytest.mark.parametrize(
  ("path", "method"),
  [
    ("/habits/{habit_id}", "patch"),
    ("/habits/{habit_id}/finish", "post"),
    ("/habits/{habit_id}", "delete"),
  ],
)
def test_openapi_403_documents_the_group_habit_message(path, method):
  forbidden = app.openapi()["paths"][path][method]["responses"]["403"]
  examples = _json_content(forbidden)["examples"]

  assert examples["habito_de_grupo"]["value"] == {"detail": MSG_GROUP_HABIT_FORBIDDEN}
  assert examples["habito_publico_de_outro"]["value"] == {"detail": MSG_HABIT_FORBIDDEN}
