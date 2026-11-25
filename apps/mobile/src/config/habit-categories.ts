import type { HabitCategory } from "@/services/types/habits";

// Nomes exibidos na tela para cada categoria da API, na ordem do seletor
export const habitCategoryLabels: Record<HabitCategory, string> = {
  musculacao: "Musculação",
  corrida: "Corrida",
  ciclismo: "Ciclismo",
  natacao: "Natação",
  cardio: "Cardio",
  esportes: "Esportes",
  alimentacao: "Alimentação",
  sono: "Sono",
  estudos: "Estudos",
  leitura: "Leitura",
  mente: "Mente",
  religiao: "Religião",
  produtividade: "Produtividade",
  financas: "Finanças",
  arte: "Arte",
  outros: "Outros",
};

// Ícone Lucide de cada categoria
export const habitCategoryIcons = {
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
