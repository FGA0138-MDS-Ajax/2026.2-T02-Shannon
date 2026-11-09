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
