# Habbit
Habbit é um sistema de gestão de hábitos desenvolvido para auxiliar os usuários a manterem uma rotina saudável e produtiva. O sistema é composto por um aplicativo mobile e uma API.

## Pre-requisitos
Antes de iniciar o projeto, veja o arquivo [REQUIREMENTS.md](REQUIREMENTS.md) para verificar as dependências necessárias e suas versões recomendadas.

## Estrutura do Repositório
O repositório do Habbit está organizado da seguinte forma:
```
habbit/
├── apps/
│   ├── api/          # Código da API do Habbit (FastAPI + PostgreSQL)
│   └── mobile/       # Código do aplicativo mobile / PWA (React Native + Expo)
├── scripts/          # Script de publicação manual em produção (deploy.sh)
├── docs/             # Documentação do projeto (branch docs -> MkDocs)
├── README.md         # Arquivo de documentação principal
└── REQUIREMENTS.md   # Arquivo com as dependências necessárias e suas versões recomendadas
```

## Implantação em Produção (Deploy)

A arquitetura de produção do Habbit opera integralmente em serviços gerenciados (custo zero, sem NGINX e sem administração manual de VPS):

| Camada | Serviço / Configuração |
|---|---|
| **API (`apps/api`)** | Vercel (Hobby), Python 3.13 + `uv`, região `gru1` (São Paulo) |
| **Banco de dados** | Neon (Free), PostgreSQL 17, região `aws-sa-east-1` (São Paulo) |
| **Armazenamento de fotos** | Cloudflare R2, bucket privado `habbit-photos-prod` (URLs assinadas) |
| **Front-end (`apps/mobile`)** | Expo Web (PWA instalável) na Vercel (Hobby) — entrega oficial |

### Fluxo de release e publicação
- A produção sai exclusivamente da branch **`main`**.
- Releases de `developer` para `main` devem ser integrados via Pull Request com **"Create a merge commit"** (nunca *squash* ou *rebase*), preservando o histórico para os releases seguintes.
- A publicação é disparada **manualmente** pelo mantenedor via [`scripts/deploy.sh`](scripts/deploy.sh) (não é CD completo): o script confere o estado da `main` e o CI (GitHub Actions), publica a API (aplicando `alembic upgrade head` no Neon durante o build de produção) e em seguida publica a PWA. Nenhum token da Vercel fica armazenado no repositório ou no GitHub.
- Consulte [`scripts/README.md`](scripts/README.md) para pré-requisitos, execução e procedimento de rollback.

### Limitações conhecidas
- **Sessão na web (`localStorage`):** na web não há `expo-secure-store`; o projeto utiliza `localStorage` (`token-storage.web.ts`) **provisoriamente** para a apresentação (falha de segurança conhecida, não sendo a solução definitiva).
- **Publicação manual:** o deploy depende da execução local do `scripts/deploy.sh` pelo mantenedor autenticado na Vercel CLI.
- **Limpeza de fotos órfãs:** `app.photos.sweep` não é agendada automaticamente (execução manual; ver [`apps/api/README.md`](apps/api/README.md)).
- **Cotas dos planos gratuitos:** sujeito aos limites de computação do Neon Free (100 CU-h/mês, 1 GB) e da Vercel Hobby (4 CPU-h ativas/mês, teto de 4,5 MB por requisição — fotos limitadas a 4 MB na API).

## Documentação (MkDocs)

A documentação do projeto utiliza [MkDocs](https://www.mkdocs.org/) com [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) e é publicada automaticamente no GitHub Pages (`gh-pages`) a partir da branch **`docs`**.
