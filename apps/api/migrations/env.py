from logging.config import fileConfig

from alembic import context
from sqlmodel import SQLModel

# 1. Importa todos os módulos de modelos para registrar
# as 6 tabelas no SQLModel.metadata
import app.auth.models  # noqa: F401 (tabela: users)
import app.auth.session.models  # noqa: F401 (tabela: auth_sessions)
import app.checkins.models  # noqa: F401 (tabelas: check_ins, check_in_habits)
import app.goals.models  # noqa: F401 (tabela: goals)
import app.habits.models  # noqa: F401 (tabela: habits)
from app.config import settings
from app.database import engine

# 2. Configurações do arquivo alembic.ini (como formato de logs)
config = context.config

if config.config_file_name is not None:
  fileConfig(config.config_file_name)

# 3. Informa ao Alembic qual é o catálogo de modelos a inspecionar
target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
  """Executa migrações no modo 'offline'.

  Gera comandos SQL em texto puro sem precisar de uma conexão ativa com o banco.
  """
  url = settings.database_url_sync
  context.configure(
    url=url,
    target_metadata=target_metadata,
    literal_binds=True,
    dialect_opts={"paramstyle": "named"},
    compare_type=True,
  )

  with context.begin_transaction():
    context.run_migrations()


def run_migrations_online() -> None:
  """Executa migrações no modo 'online'.

  Conecta diretamente ao banco de dados e aplica as alterações.
  """
  # Se o pytest injetou uma conexão temporária no config.attributes, usa ela.
  # Caso contrário, usa o engine padrão configurado na aplicação.
  connection = config.attributes.get("connection")

  if connection is not None:
    context.configure(
      connection=connection,
      target_metadata=target_metadata,
      compare_type=True,
    )
    with context.begin_transaction():
      context.run_migrations()
  else:
    with engine.connect() as conn:
      context.configure(
        connection=conn,
        target_metadata=target_metadata,
        compare_type=True,
      )
      with context.begin_transaction():
        context.run_migrations()


# Ponto de entrada: decide se executa offline ou online
if context.is_offline_mode():
  run_migrations_offline()
else:
  run_migrations_online()
