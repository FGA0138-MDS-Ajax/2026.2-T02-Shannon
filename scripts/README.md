# Script de deploy (`scripts/deploy.sh`)

Publica a API (`apps/api`, com migrações Alembic no Neon) e a PWA (`apps/mobile`) em produção na Vercel com um único comando, a partir da branch `main`.

> **Importante:** este script é uma publicação manual disparada pelo mantenedor após um release — **não é CD completo**. Nenhum token da Vercel fica no repositório nem no GitHub Actions, porque qualquer pessoa com acesso de escrita ao repositório conseguiria obter secrets por meio de workflows.

## Pré-requisitos

- `git`, `curl`, `python3` e [Vercel CLI](https://vercel.com/docs/cli) instalados no PATH (opcional: `gh` autenticado para evitar limite de taxa da API pública do GitHub).
- Autenticação local na conta pessoal da Vercel do mantenedor:
  ```bash
  vercel login
  ```
- Projetos `habbit-api` e `habbit-web` criados na Vercel (sem repositório Git conectado) com as variáveis de ambiente de produção cadastradas.

## Como rodar

1. Atualize a branch `main` local e garanta que a árvore esteja limpa:
   ```bash
   git checkout main
   git pull --ff-only origin main
   ```
2. Execute o script a partir da raiz do repositório:
   ```bash
   ./scripts/deploy.sh
   ```

O script:
1. Confere branch `main`, árvore limpa, `HEAD == origin/main` e login na Vercel.
2. Confere se todos os checks do GitHub Actions desse commit passaram (inclusive testes de banco com Testcontainers, que não rodam localmente sem Docker).
3. Publica a API (`habbit-api`) — o build de produção executa `alembic upgrade head` no Neon usando `DIRECT_DATABASE_URL`. Se falhar, para sem publicar a PWA.
4. Confere `GET /` na API (`HTTP 200` com `"OK"`). Se falhar, para sem publicar a PWA.
5. Publica a PWA (`habbit-web`).
6. Confere `GET /` na PWA e imprime o resumo final.

## Como voltar atrás (rollback)

- **Pelo painel da Vercel:** abra o projeto (`habbit-api` ou `habbit-web`) → aba **Deployments** → clique nos três pontos (`...`) da publicação anterior saudável → **Promote to Production**.
- **Pela CLI:**
  ```bash
  vercel rollback --cwd apps/api
  vercel rollback --cwd apps/mobile
  ```

> **Atenção sobre o banco de dados:** o rollback na Vercel restaura apenas o código da API ou da PWA; **migrações Alembic já aplicadas no Neon não são desfeitas automaticamente**.
