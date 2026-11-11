from fastapi import APIRouter

from app.group.groups import groups_router

group_router = APIRouter(prefix="/groups", tags=["groups"])
group_router.include_router(groups_router)
