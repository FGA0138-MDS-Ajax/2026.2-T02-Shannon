#!/usr/bin/env bash
# Script de publicação manual do Habbit em produção (API + migrações Neon + PWA).
#
# Não é CD completo: é disparado manualmente pelo mantenedor após um release na
# branch `main`, usando o login local da CLI da Vercel (`vercel login`).
# Nenhum token ou segredo é armazenado neste script ou no GitHub.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${REPO_ROOT}" ]]; then
  echo "[deploy] ERRO: execute este script dentro do repositório Git do Habbit." >&2
  exit 1
fi
cd "${REPO_ROOT}"

GITHUB_REPO="${GITHUB_REPO:-FGA0138-MDS-Ajax/2026.2-T02-Shannon}"
VERCEL_API_PROJECT="${VERCEL_API_PROJECT:-habbit-api}"
VERCEL_WEB_PROJECT="${VERCEL_WEB_PROJECT:-habbit-web}"
API_HEALTH_URL="${API_HEALTH_URL:-}"
WEB_HEALTH_URL="${WEB_HEALTH_URL:-}"

log() {
  printf '\n[deploy] %s\n' "$*"
}

fail() {
  printf '\n[deploy] ERRO: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Ferramenta obrigatória não encontrada no PATH: $1"
}

ensure_vercel_link() {
  local dir="$1"
  local project="$2"
  if [[ ! -f "${dir}/.vercel/project.json" ]]; then
    log "Vinculando ${dir} ao projeto Vercel '${project}' (sem conectar Git)..."
    vercel link --project "${project}" --yes --cwd "${dir}" >/dev/null
    # A CLI pode gerar .env.local temporário e alterar .gitignore local ao vincular.
    rm -f "${dir}/.env.local"
    if git ls-files --error-unmatch "${dir}/.gitignore" >/dev/null 2>&1; then
      git checkout -- "${dir}/.gitignore"
    fi
  fi
}

extract_url() {
  python3 -c '
import re, sys
text = sys.stdin.read()
urls = re.findall(r"https://[a-zA-Z0-9._-]+\.vercel\.app", text)
print(urls[-1] if urls else "")
'
}

check_http_ok() {
  local url="$1"
  local expected_body="${2:-}"
  local attempts=5
  local delay=3
  local i status body

  for ((i = 1; i <= attempts; i++)); do
    body="$(curl -fsSL --max-time 15 -w $'\n%{http_code}' "${url}" 2>/dev/null || true)"
    status="${body##*$'\n'}"
    body="${body%$'\n'*}"
    if [[ "${status}" == "200" ]]; then
      if [[ -z "${expected_body}" || "${body}" == "${expected_body}" ]]; then
        return 0
      fi
    fi
    if ((i < attempts)); then
      sleep "${delay}"
    fi
  done
  return 1
}

# ---------------------------------------------------------------------------
# Passo 1: Conferir pré-requisitos, login da Vercel, branch main e árvore limpa
# ---------------------------------------------------------------------------
log "Passo 1/6: Conferindo ferramentas, login na Vercel e estado do Git..."

require_cmd git
require_cmd vercel
require_cmd curl
require_cmd python3

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${CURRENT_BRANCH}" != "main" ]]; then
  fail "Você está na branch '${CURRENT_BRANCH}'. Troque para 'main' antes de publicar."
fi

if [[ -n "$(git status --porcelain)" ]]; then
  fail "A árvore de trabalho tem alterações não commitadas ou arquivos não rastreados. Deixe-a limpa antes de publicar."
fi

git fetch origin main --quiet
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/main)"
if [[ "${LOCAL_SHA}" != "${REMOTE_SHA}" ]]; then
  fail "HEAD local (${LOCAL_SHA:0:7}) difere de origin/main (${REMOTE_SHA:0:7}). Atualize a 'main' antes de publicar."
fi

VERCEL_USER="$(vercel whoami 2>/dev/null || true)"
if [[ -z "${VERCEL_USER}" ]]; then
  fail "Você não está autenticado na CLI da Vercel. Rode 'vercel login' primeiro."
fi
echo "  - Branch: main (${LOCAL_SHA:0:7}) alinhada com origin/main"
echo "  - Árvore local limpa"
echo "  - Vercel CLI autenticada"

# ---------------------------------------------------------------------------
# Passo 2: Conferir que os checks do GitHub Actions desse commit passaram
# ---------------------------------------------------------------------------
log "Passo 2/6: Conferindo verificações do GitHub Actions para ${LOCAL_SHA:0:7}..."

CHECKS_JSON=""
if command -v gh >/dev/null 2>&1; then
  CHECKS_JSON="$(gh api "repos/${GITHUB_REPO}/commits/${LOCAL_SHA}/check-runs" 2>/dev/null || true)"
fi
if [[ -z "${CHECKS_JSON}" ]]; then
  CHECKS_JSON="$(curl -fsSL \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${GITHUB_REPO}/commits/${LOCAL_SHA}/check-runs" 2>/dev/null || true)"
fi
[[ -n "${CHECKS_JSON}" ]] || fail "Não foi possível consultar o status do GitHub Actions para ${LOCAL_SHA:0:7}."

printf '%s' "${CHECKS_JSON}" | python3 -c '
import json, sys

data = json.load(sys.stdin)
runs = data.get("check_runs") or []
if not runs:
    print("[deploy] ERRO: nenhum check do GitHub Actions encontrado para este commit.", file=sys.stderr)
    sys.exit(1)

allowed = {"success", "skipped", "neutral"}
problems = []
for run in runs:
    name = run.get("name", "<sem nome>")
    status = run.get("status", "unknown")
    conclusion = run.get("conclusion")
    print(f"  - {name}: status={status}, conclusion={conclusion}")
    if status != "completed" or conclusion not in allowed:
        problems.append(f"{name} (status={status}, conclusion={conclusion})")

if problems:
    print("[deploy] ERRO: nem todos os checks do CI passaram:", file=sys.stderr)
    for item in problems:
        print(f"    * {item}", file=sys.stderr)
    sys.exit(1)
'

# ---------------------------------------------------------------------------
# Passo 3: Publicar a API (as migrações do Alembic no Neon rodam no build)
# ---------------------------------------------------------------------------
log "Passo 3/6: Publicando a API (${VERCEL_API_PROJECT}) — migrações do Neon rodam no build..."

ensure_vercel_link "apps/api" "${VERCEL_API_PROJECT}"

API_DEPLOY_OUTPUT="$(vercel deploy --prod --yes --cwd apps/api 2>&1)" || {
  printf '%s\n' "${API_DEPLOY_OUTPUT}" >&2
  fail "Falha ao publicar a API (ou nas migrações do banco). A PWA NÃO foi publicada."
}
printf '%s\n' "${API_DEPLOY_OUTPUT}"

API_URL="${API_HEALTH_URL}"
if [[ -z "${API_URL}" ]]; then
  API_URL="$(printf '%s' "${API_DEPLOY_OUTPUT}" | extract_url)"
fi
[[ -n "${API_URL}" ]] || fail "Não foi possível identificar a URL de produção da API."

# ---------------------------------------------------------------------------
# Passo 4: Conferir que a API responde
# ---------------------------------------------------------------------------
log "Passo 4/6: Verificando saúde da API em ${API_URL}/ ..."

if ! check_http_ok "${API_URL}/" '"OK"'; then
  fail "A API em ${API_URL}/ não respondeu HTTP 200 com \"OK\". A PWA NÃO foi publicada."
fi
echo "  - API respondeu HTTP 200 (\"OK\")"

# ---------------------------------------------------------------------------
# Passo 5: Publicar a PWA
# ---------------------------------------------------------------------------
log "Passo 5/6: Publicando a PWA (${VERCEL_WEB_PROJECT})..."

ensure_vercel_link "apps/mobile" "${VERCEL_WEB_PROJECT}"

WEB_DEPLOY_OUTPUT="$(vercel deploy --prod --yes --cwd apps/mobile 2>&1)" || {
  printf '%s\n' "${WEB_DEPLOY_OUTPUT}" >&2
  fail "Falha ao publicar a PWA."
}
printf '%s\n' "${WEB_DEPLOY_OUTPUT}"

WEB_URL="${WEB_HEALTH_URL}"
if [[ -z "${WEB_URL}" ]]; then
  WEB_URL="$(printf '%s' "${WEB_DEPLOY_OUTPUT}" | extract_url)"
fi

# ---------------------------------------------------------------------------
# Passo 6: Conferir que a PWA responde e mostrar resumo
# ---------------------------------------------------------------------------
log "Passo 6/6: Verificando saúde da PWA e gerando resumo..."

WEB_STATUS="OK (HTTP 200)"
if [[ -z "${WEB_URL}" ]]; then
  WEB_STATUS="AVISO: URL da PWA não identificada na saída da CLI"
elif ! check_http_ok "${WEB_URL}/"; then
  WEB_STATUS="AVISO: ${WEB_URL}/ não respondeu HTTP 200 dentro do tempo esperado"
fi

cat <<EOF

====================================================================
  Deploy do Habbit concluído
====================================================================
  Commit publicado : ${LOCAL_SHA}
  API (produção)   : ${API_URL}  [OK]
  Migrações (Neon) : aplicadas no build de produção da API
  PWA (produção)   : ${WEB_URL:-<verificar no painel da Vercel>}  [${WEB_STATUS}]

  Rollback: no painel da Vercel (Deployments -> Promote to Production)
  ou via CLI: vercel rollback --cwd apps/api | apps/mobile
  (Lembrete: migrações Alembic aplicadas no banco não são desfeitas.)
====================================================================
EOF
