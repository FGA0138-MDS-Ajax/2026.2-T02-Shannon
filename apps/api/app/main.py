from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import auth_router
from app.checkins.router import check_ins_router
from app.goals.router import goals_router
from app.group.router import group_router
from app.habits.router import habit_router
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


@app.get("/")
async def root():
  return "OK"
