# Arquitetura do Mobile (`apps/mobile`)

Esta página descreve a organização do aplicativo **React Native + Expo** (`apps/mobile`), que é entregue em **Android**, **iOS** e **Web como PWA** (publicada na Vercel). A visão de implantação está em [Implantação e CI/CD](implantacao.md).

---

## 1. Navegação (Expo Router)

```text
src/app/
├── index.tsx, _layout.tsx
├── (auth)/            login, signup
└── (app)/
    ├── (tabs)/        index (Home), habits, check-in, groups, user
    ├── habits/        create, [id]/ (index, edit, goal)
    ├── check-ins/     create, [id]/ (index, edit/)
    └── groups/        create, join, [id]/ (index, edit, habits/create, habits/[habitId]/ (index, edit))
```

- Rotas públicas ficam em `(auth)`; as autenticadas, em `(app)`, com navegação principal por abas em `(tabs)`.
- A **Home** reúne o painel de estatísticas (histórico de 28 dias, anéis e gráfico de check-ins) e o **check-in rápido** nos cartões de hábito.
- **Grupos:** lista, criação, entrada por código de convite, detalhe do grupo (visão geral, membros, hábitos, feed, ranking e estatísticas) e hábitos de grupo.

---

## 2. Camadas

| Pasta | Responsabilidade |
| :--- | :--- |
| `components/` | Componentes por domínio: `ui/` (cartões, seções, abas segmentadas, estados de carregamento e erro), `statistics/`, `groups/`, `check-in-flow/`, `forms/`, `habit-detail/` e componentes isolados (`button`, `input`, `habit-card`, `calendar`, `goal-picker`, `category-picker`). |
| `hooks/` | `useSession`, `useCheckInFlow`, `useUserStatistics`, `useHabitsCheckIns`, `useRefreshOnFocus`, `useAsyncAction`, `useFonts`. |
| `contexts/` | `AuthContext` (sessão em memória e restauração ao abrir o app). |
| `services/` | Cliente HTTP (`api.ts`) e serviços por domínio: `habits-api`, `goals-api`, `check-ins-api`, `statistics-api`, `groups-api`; `api-errors.ts` e `types/`. |
| `config/` | `theme.ts` (tokens de design), `swr.tsx`, `habit-categories.ts`, `goal-labels.ts`, `group-labels.ts`. |
| `utils/` | Datas, duração ISO 8601, progresso de check-in e histórico de hábito. |

---

## 3. Dados e Sessão

- **SWR** para busca, cache em memória e revalidação (inclusive ao voltar do segundo plano, via `AppState`).
- **Cliente `fetch`** com injeção do *Bearer token* e renovação automática em `401`, com um único *refresh* em voo compartilhado ([ADR-015](adrs.md#adr-015-cliente-http-do-mobile-com-fetch-e-refresh-em-voo-unico)).
- **Armazenamento dos tokens:** `expo-secure-store` em dispositivos nativos e `localStorage` na Web (`token-storage.web.ts`, selecionado automaticamente pelo Metro).
- A URL da API vem de `EXPO_PUBLIC_API_URL`; sem ela, usa-se `10.0.2.2:8000` no emulador Android e `127.0.0.1:8000` nos demais ambientes.

---

## 4. PWA

- `public/manifest.json` (nome, ícones de 192 e 512 px, `display: standalone`, `lang: pt-BR`) e `apple-touch-icon`.
- `apps/mobile/vercel.json`: *build* `expo export -p web`, saída em `dist`, `cleanUrls` e reescrita de todas as rotas para `/index.html`.

---

## 5. Testes e Catálogo

- **Jest + React Native Testing Library** (`jest-expo`): 39 arquivos de teste em `src/__tests__/` (`app`, `components`, `config`, `contexts`, `hooks`, `services`, `utils`).
- **Storybook React Native** para componentes isolados (`button`, `input`, `habit-card`, `goal-picker`, `goal-progress`, `category-picker`).
- O CI executa `tsc --noEmit` e `pnpm test` ([Implantação e CI/CD](implantacao.md#2-pipelines-de-integracao-continua-ci-e-publicacao-manual)).
