export const APP_NAME = "Habbit";

/**
 * Título da aba do navegador (PWA) por rota, pelos segmentos do Expo Router
 * (grupos entre parênteses e parâmetros entre colchetes, sem o "index").
 * Telas de detalhe trocam pelo nome carregado (ex.: nome do grupo).
 */
export const PAGE_TITLES: Record<string, string> = {
  "": APP_NAME,
  "(auth)/login": "Entrar",
  "(auth)/signup": "Criar conta",
  "(app)/(tabs)": "Painel",
  "(app)/(tabs)/habits": "Meus hábitos",
  "(app)/(tabs)/check-in": "Meus check-ins",
  "(app)/(tabs)/groups": "Meus grupos",
  "(app)/(tabs)/user": "Usuário",
  "(app)/habits/create": "Novo hábito",
  "(app)/habits/[id]": "Hábito",
  "(app)/habits/[id]/edit": "Editar hábito",
  "(app)/habits/[id]/goal": "Meta do hábito",
  "(app)/check-ins/create": "Novo check-in",
  "(app)/check-ins/[id]": "Check-in",
  "(app)/check-ins/[id]/edit": "Editar check-in",
  "(app)/groups/create": "Novo grupo",
  "(app)/groups/join": "Entrar em grupo",
  "(app)/groups/[id]": "Grupo",
  "(app)/groups/[id]/edit": "Editar grupo",
  "(app)/groups/[id]/habits/create": "Hábito do grupo",
  "(app)/groups/[id]/habits/[habitId]": "Hábito do grupo",
  "(app)/groups/[id]/habits/[habitId]/edit": "Editar hábito do grupo",
};

/** "Meus hábitos · Habbit"; a página inicial fica só "Habbit" */
export function formatPageTitle(title?: string): string {
  return !title || title === APP_NAME ? APP_NAME : `${title} · ${APP_NAME}`;
}

/** Título da rota pelos segmentos; rota sem entrada no mapa fica "Habbit" */
export function titleForSegments(segments: readonly string[]): string {
  const key = segments.filter((segment) => segment !== "index").join("/");
  return formatPageTitle(PAGE_TITLES[key]);
}
