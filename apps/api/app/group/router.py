from fastapi import APIRouter

from app.group.groups import register_routes as register_groups_routes
from app.group.invite import register_routes as register_invite_routes
from app.group.members import register_routes as register_members_routes

group_router = APIRouter(prefix="/groups", tags=["groups"])

# Registra primeiro as rotas fixas para evitar conflitos com /{group_id}.
register_invite_routes(group_router)
register_groups_routes(group_router)
register_members_routes(group_router)
