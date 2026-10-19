from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.auth.router import auth_router
from app.checkins.router import check_ins_router
from app.database import create_db_and_tables
from app.habits.router import habit_router


@asynccontextmanager
async def lifespan(app: FastAPI):
  create_db_and_tables()
  yield


app = FastAPI(lifespan=lifespan)

# Routers

app.include_router(auth_router)
app.include_router(habit_router)
app.include_router(check_ins_router)


@app.get("/")
async def root():
  return "OK"
