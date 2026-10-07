from sqlmodel import create_engine

def db_connection(connection_url: str):
  return create_engine(
    connection_url,
    echo=False,
)