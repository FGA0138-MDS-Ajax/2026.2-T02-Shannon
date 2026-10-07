from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database import create_db_and_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(lifespan=lifespan)

# Routers


@app.get("/")
async def root():
    return "OK"