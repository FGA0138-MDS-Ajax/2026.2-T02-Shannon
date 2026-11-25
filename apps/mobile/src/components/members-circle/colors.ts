// Cores das pessoas do grupo, do Figma: as 4 primeiras são as do grupo de 4
// pessoas, as outras vêm do círculo de 30 pessoas. A roda, o ranking e o
// Sobre usam a mesma cor para a mesma pessoa.
export const MEMBER_COLORS = [
  "#F16532",
  "#D9AD6C",
  "#8FA77B",
  "#A998BB",
  "#7DAEAA",
  "#8C9FC0",
  "#D5836C",
  "#D6BE81",
  "#A3B476",
  "#E98243",
];

/** Cor da pessoa pela posição dela no grupo (a mesma ordem da roda) */
export function memberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}
