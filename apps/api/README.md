# 🚀 Habbit API

Backend do ecossistema **Habbit**, um sistema de gestão de hábitos projetado para auxiliar os usuários a manterem uma rotina saudável e produtiva. A API é desenvolvida com **FastAPI** em **Python 3.13**, utilizando **SQLModel** para mapeamento objeto-relacional e **PostgreSQL** como banco de dados relacional.

---

## 🛠️ Tecnologias e Ferramentas

- **Linguagem:** [Python 3.13](https://www.python.org/)
- **Gerenciador de Pacotes e Ambientes:** [uv](https://docs.astral.sh/uv/) (>= 0.7)
- **Framework Web:** [FastAPI](https://fastapi.tiangolo.com/) (>= 0.141)
- **ORM / Modelagem de Dados:** [SQLModel](https://sqlmodel.tiangolo.com/) & [SQLAlchemy](https://www.sqlalchemy.org/)
- **Banco de Dados:** [PostgreSQL 17](https://www.postgresql.org/) com driver [psycopg 3](https://www.psycopg.org/)
- **Validação e Configurações:** [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- **Linter & Formatter:** [Ruff](https://docs.astral.sh/ruff/)
- **Testes:** [pytest](https://docs.pytest.org/) e [Testcontainers](https://testcontainers-python.readthedocs.io/)
- **Containerização:** [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em seu ambiente:

- **Python 3.13+**
- **uv** (versão recomendada: `>= 0.7`) — [Guia de Instalação](https://docs.astral.sh/uv/getting-started/installation/)
- **Docker** e **Docker Compose** (necessários para o banco de dados e testes de integração com Testcontainers)

Para mais detalhes de versões compatíveis, consulte o arquivo [REQUIREMENTS.md](../../REQUIREMENTS.md) na raiz do repositório.

---

## ⚙️ Configuração do Ambiente

1. Acesse o diretório da API:
   ```bash
   cd apps/api
   ```

2. Crie o arquivo `.env` a partir do template `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Ajuste as variáveis de ambiente no arquivo `.env` conforme necessário:
   ```env
   DATABASE_URL="postgres://habbit:habbit@localhost:5432/habbit"
   ```

---

## 📦 Instalação das Dependências

Utilize o `uv` para criar o ambiente virtual e sincronizar todas as dependências do projeto:

```bash
# Sincroniza dependências de produção e desenvolvimento
uv sync
```

---

## 🗄️ Banco de Dados

Você pode subir uma instância do PostgreSQL localmente utilizando o Docker Compose configurado na raiz do projeto:

```bash
# Na raiz do repositório:
docker compose up -d postgresql
```

As tabelas do banco de dados são geradas automaticamente na inicialização da aplicação pelo ciclo de vida (`lifespan`) do FastAPI.

---

## 🏃 Executando a API

### Modo Desenvolvimento (Hot Reload)

Com o banco de dados ativo e o ambiente sincronizado, execute o servidor de desenvolvimento:

```bash
uv run fastapi dev app/main.py
```

A API estará acessível em: [http://localhost:8000](http://localhost:8000)

### Modo Produção

```bash
uv run fastapi run app/main.py --host 0.0.0.0 --port 8000
```

### Executando com Docker

Você também pode construir e executar toda a stack (PostgreSQL + API) usando Docker Compose na raiz do monorepo:

```bash
docker compose up --build
```

---

## 📖 Documentação Interativa

O FastAPI gera automaticamente documentações interativas da API:

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Healthcheck:** `GET http://localhost:8000/` (retorna `"OK"`)

---

## 🧪 Testes

A suíte de testes utiliza **pytest** em conjunto com **testcontainers**, inicializando um contêiner descartável do PostgreSQL para testes de integração reais:

> [!NOTE]
> Certifique-se de que o serviço do Docker esteja em execução na máquina para que o Testcontainers consiga provisionar o banco de teste.

Execute os testes com:

```bash
uv run pytest
```

---

## 🧹 Qualidade de Código (Lint & Format)

O projeto utiliza **Ruff** para linting e formatação rápida de código Python:

```bash
# Verificar problemas de lint
uv run ruff check .

# Corrigir problemas automaticamente
uv run ruff check --fix .

# Verificar formatação
uv run ruff format --check .

# Formatar arquivos
uv run ruff format .
```

---

## 📂 Estrutura de Diretórios

```
apps/api/
├── app/
│   ├── auth/           # Módulo de autenticação (rotas, schemas, serviços)
│   ├── group/          # Módulo de grupos de hábitos
│   ├── goals/          # Metas dos hábitos (modelo, schemas, mensagens; ver README do módulo)
│   ├── habit/          # Módulo principal de hábitos
│   ├── config.py       # Configurações da aplicação (Pydantic Settings)
│   ├── database.py     # Engine de conexão e dependências de sessão do banco
│   └── main.py         # Ponto de entrada da aplicação FastAPI
├── tests/
│   ├── conftest.py     # Fixtures de sessão e Testcontainers para PostgreSQL
│   └── support/        # Utilitários de teste e conexão
├── .env.example        # Exemplo de variáveis de ambiente
├── Dockerfile          # Imagem Docker multi-stage otimizada com uv
├── pyproject.toml      # Configuração do projeto e dependências (uv/pip)
└── uv.lock             # Lockfile de dependências determinísticas
```
