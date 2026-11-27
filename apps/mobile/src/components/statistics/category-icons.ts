import type { HabitCategory } from "@/services/types/habits";

// Ícone Lucide de cada categoria, para o quadradinho dos cards de hábito
export const categoryIcons = {
  musculacao: "dumbbell",
  corrida: "footprints",
  ciclismo: "bike",
  natacao: "waves",
  cardio: "heart-pulse",
  esportes: "trophy",
  alimentacao: "droplet",
  sono: "moon",
  estudos: "graduation-cap",
  leitura: "book-open",
  mente: "brain",
  religiao: "church",
  produtividade: "list-checks",
  financas: "wallet",
  arte: "palette",
  outros: "sparkles",
} as const satisfies Record<HabitCategory, string>;
