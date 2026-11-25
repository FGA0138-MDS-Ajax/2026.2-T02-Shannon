import type {
  FeedCursor,
  FeedItem,
  FeedPage,
  GroupHabit,
  GroupHabitStatistics,
  UserRef,
} from "@/services/types/groups";
import type {
  GoalPublic,
  HabitCategory,
  ProgressStatus,
} from "@/services/types/habits";

// Dados falsos do grupo, para desenvolver a tela e os testes sem a API.
// Mesmo grupo, pessoas e números do protótipo no Figma (8 de 12 hábitos).
// Diferença: no Figma a Lu fez "Meditar", que não é hábito do grupo; aqui
// todo mundo tem os mesmos 3 hábitos, como na API.

const GROUP = { id: "g1", name: "Movimento diário" };
const TODAY = "2026-11-13";

const caio: UserRef = { id: "u1", username: "Caio" };
const ana: UserRef = { id: "u2", username: "Ana" };
const breno: UserRef = { id: "u3", username: "Breno" };
const lu: UserRef = { id: "u4", username: "Lu" };
const members = [caio, ana, breno, lu];

const everyDay: GoalPublic = {
  schedule_type: "frequency",
  period: "day",
  target_count: 1,
  period_end_weekday: null,
  starts_on: "2026-11-02",
};

function groupHabit(
  id: string,
  name: string,
  category: HabitCategory,
  description: string,
): GroupHabit {
  return {
    id,
    name,
    description,
    category,
    is_public: false,
    status: "active",
    author_user_id: null,
    author_group_id: GROUP.id,
    created_at: "2026-11-02",
    target_end_date: null,
    finished_at: null,
    goal: everyDay,
    group: GROUP,
  };
}

const pedalar = groupHabit(
  "h1",
  "Pedalar",
  "ciclismo",
  "30 minutos de bicicleta.",
);
const beberAgua = groupHabit(
  "h2",
  "Beber água",
  "alimentacao",
  "Beber 2 litros ao longo do dia.",
);
const ler = groupHabit(
  "h3",
  "Ler 10 páginas",
  "leitura",
  "Reservar um tempo para ler.",
);

export const feedGroupHabits: GroupHabit[] = [pedalar, beberAgua, ler];

// Horário local: no aparelho aparece sempre o mesmo `09:32` do Figma
function at(hour: number, minute: number): string {
  return new Date(2026, 10, 13, hour, minute).toISOString();
}

function checkIn(
  id: string,
  author: UserRef,
  habits: GroupHabit[],
  title: string,
  description: string | null,
  createdAt: string,
): FeedItem {
  return {
    cursor: `cursor-${id}` as FeedCursor,
    id,
    author,
    title,
    description,
    habits: habits.map(({ id: habitId, name }) => ({ id: habitId, name })),
    created_at: createdAt,
  };
}

// Do mais novo para o mais antigo, como a API devolve
export const feedPage: FeedPage = {
  items: [
    checkIn(
      "c1",
      caio,
      [pedalar],
      "30 min de bicicleta pelo bairro.",
      "Pedalei pelo bairro antes de começar o dia. Meta cumprida!",
      at(9, 32),
    ),
    checkIn(
      "c2",
      ana,
      [beberAgua],
      "Meta do dia: 2 litros de água.",
      null,
      at(9, 18),
    ),
    checkIn(
      "c3",
      breno,
      [ler],
      "Um pouco de leitura todos os dias.",
      "Li o capítulo 3 no ônibus.",
      at(8, 50),
    ),
    checkIn("c4", lu, [pedalar], "Volta curta no quarteirão.", null, at(8, 5)),
    checkIn(
      "c5",
      caio,
      [beberAgua, ler],
      "Água e leitura antes do trabalho.",
      "Fechei as duas metas cedo.",
      at(7, 40),
    ),
    checkIn("c6", ana, [ler], "Dez páginas no café da manhã.", null, at(7, 10)),
    checkIn(
      "c7",
      breno,
      [beberAgua],
      "Primeiro litro do dia.",
      null,
      at(6, 55),
    ),
  ],
  next_cursor: null,
  has_more: false,
};

// Quem já fez cada hábito hoje, igual aos check-ins acima
const doneToday: Record<string, string[]> = {
  [pedalar.id]: [caio.id, lu.id],
  [beberAgua.id]: [caio.id, ana.id, breno.id],
  [ler.id]: [caio.id, ana.id, breno.id],
};

function habitStats(habit: GroupHabit): GroupHabitStatistics {
  return {
    as_of: TODAY,
    habit_id: habit.id,
    name: habit.name,
    habit_status: habit.status,
    members: members.map((user) => {
      const done = doneToday[habit.id].includes(user.id) ? 1 : 0;
      const status: ProgressStatus = done === 1 ? "completed" : "in_progress";
      return {
        user,
        check_in_days: done + 4,
        progress: {
          habit_id: habit.id,
          goal: habit.goal,
          current_period: { start: TODAY, end: TODAY, done, target_count: 1 },
          status,
          current_streak: done + 4,
          best_streak: 6,
          streak_started_on: "2026-11-09",
          consistent_days: done + 4,
        },
      };
    }),
  };
}

export const feedHabitStats: GroupHabitStatistics[] =
  feedGroupHabits.map(habitStats);

// Dias da semana em que as 4 pessoas fizeram tudo (a segunda laranja do Figma)
export const feedCompleteDays: string[] = ["2026-11-09"];
