// A API já manda a taxa arredondada (ex.: 11.1); só trocamos o ponto pela vírgula
export function formatPercent(rate: number): string {
  return `${String(rate).replace(".", ",")}%`;
}

export const NO_DATA_LABEL = "Sem dados ainda";

/** `"Breno Silva"` → `"Olá, Breno!"`; sem nome, só `"Olá!"` */
export function greeting(userName?: string): string {
  const firstName = userName?.trim().split(" ")[0];
  return firstName ? `Olá, ${firstName}!` : "Olá!";
}
