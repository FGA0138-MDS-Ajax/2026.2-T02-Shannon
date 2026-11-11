from fastapi import APIRouter

from app.group.groups import register_routes

group_router = APIRouter(prefix="/groups", tags=["groups"])
register_routes(group_router)
