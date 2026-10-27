// TEMPORÁRIO: dados falsos de hábitos para montar as telas da #50 enquanto a
// camada de dados da #49 não entra. Os nomes seguem a especificação da #49;
// quando ela for integrada, troque os imports para os arquivos reais e apague
// este arquivo.

export type HabitCategory =
  | "musculacao"
  | "corrida"
  | "ciclismo"
  | "natacao"
  | "cardio"
  | "esportes"
  | "alimentacao"
  | "sono"
  | "estudos"
  | "leitura"
  | "mente"
  | "religiao"
  | "produtividade"
  | "financas"
  | "arte"
  | "outros";

export type HabitStatus = "active" | "finished";

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  category: HabitCategory;
  is_public: boolean;
  status: HabitStatus;
  author_user_id: string;
  // Datas no formato YYYY-MM-DD, como a API devolve
  created_at: string;
  target_end_date: string | null;
  finished_at: string | null;
}

export interface HabitCreate {
  name: string;
  category: HabitCategory;
  description?: string | null;
  is_public?: boolean;
  target_end_date?: string | null;
}

const FAKE_DELAY_MS = 500;
const FAKE_AUTHOR_ID = "00000000-0000-0000-0000-000000000001";

let habits: Habit[] = [
  {
    id: "1",
    name: "Ler 10 páginas",
    description: "Antes de dormir",
    category: "leitura",
    is_public: false,
    status: "finished",
    author_user_id: FAKE_AUTHOR_ID,
    created_at: "2026-10-01",
    target_end_date: null,
    finished_at: "2026-10-20",
  },
  {
    id: "2",
    name: "Correr 5 km",
    description: null,
    category: "corrida",
    is_public: true,
    status: "active",
    author_user_id: FAKE_AUTHOR_ID,
    created_at: "2026-10-10",
    target_end_date: "2026-12-31",
    finished_at: null,
  },
  {
    id: "3",
    name: "Dormir antes da meia-noite",
    description: null,
    category: "sono",
    is_public: false,
    status: "active",
    author_user_id: FAKE_AUTHOR_ID,
    created_at: "2026-10-20",
    target_end_date: null,
    finished_at: null,
  },
];

// Simula o tempo de resposta da rede
function wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, FAKE_DELAY_MS));
}

// Data local (toISOString usaria UTC e viraria o dia às 21h no Brasil)
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Do mais novo para o mais antigo, como o GET /habits
export async function listHabits(status?: HabitStatus): Promise<Habit[]> {
  await wait();
  return habits
    .filter((habit) => !status || habit.status === status)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createHabit(body: HabitCreate): Promise<Habit> {
  await wait();
  const habit: Habit = {
    id: String(Date.now()),
    name: body.name,
    description: body.description ?? null,
    category: body.category,
    is_public: body.is_public ?? false,
    status: "active",
    author_user_id: FAKE_AUTHOR_ID,
    created_at: today(),
    target_end_date: body.target_end_date ?? null,
    finished_at: null,
  };
  habits = [habit, ...habits];
  return habit;
}

// A versão real (#49) transforma o 422 da API em { campo: mensagem }
export function getFieldErrors(_error: unknown): Record<string, string> {
  return {};
}
