from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import auth_router
from app.checkins.router import check_ins_router
from app.goals.router import goals_router
from app.group.feed import feed_router
from app.group.habits import group_habits_router
from app.group.ranking import ranking_router
from app.group.responses import EXAMPLE_GROUP_STATS_EMPTY
from app.group.router import group_router
from app.group.stats import stats_router
from app.habits.router import habit_router
from app.photos.router import photos_router
from app.statistics.router import statistics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
  yield


app = FastAPI(lifespan=lifespan)

# Middlewares

# CORS
origins = ["*"]

app.add_middleware(
  CORSMiddleware,
  allow_origins=origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# Routers

app.include_router(auth_router)
app.include_router(habit_router)
app.include_router(check_ins_router)
app.include_router(goals_router)
app.include_router(statistics_router)
app.include_router(group_router)
app.include_router(group_habits_router)
app.include_router(feed_router)
app.include_router(ranking_router)
app.include_router(stats_router)
app.include_router(photos_router)


_default_openapi = app.openapi
_openapi_patched = False


def custom_openapi() -> dict[str, Any]:
  """OpenAPI padrão, com os `null` dos exemplos reinseridos.

  O FastAPI monta o OpenAPI com `exclude_none=True` e apaga todo valor `null`,
  inclusive dentro dos exemplos. Sem isto, o Swagger do `/stats` mostraria o
  exemplo sem as chaves `most_consistent` e `best_record`, escondendo que elas
  podem ser `null`.
  """
  global _openapi_patched
  schema = _default_openapi()
  if not _openapi_patched:
    examples = schema["paths"]["/groups/{group_id}/stats"]["get"]["responses"]["200"][
      "content"
    ]["application/json"]["examples"]
    examples["sem_pontuacao"]["value"] = EXAMPLE_GROUP_STATS_EMPTY
    _openapi_patched = True
  return schema


app.openapi = custom_openapi  # type: ignore[method-assign]


@app.get("/")
async def root():
  return "OK"
