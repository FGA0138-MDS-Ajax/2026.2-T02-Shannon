// Duração do check-in em ISO 8601, que é o único formato que a API aceita
// (ela recusa `1800` e `00:30:00`). O back devolve dias, horas, minutos e
// segundos, ex.: "PT30M", "PT1H30M", "P1DT2H", "PT45S".
const ISO_DURATION =
  /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

/** `90` vira `"PT1H30M"`. A API só aceita duração maior que zero. */
export function minutesToIsoDuration(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new RangeError(
      "A duração deve ser um número inteiro de minutos maior que zero.",
    );
  }

  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;

  return `PT${hours > 0 ? `${hours}H` : ""}${rest > 0 ? `${rest}M` : ""}`;
}

/** `"PT1H30M"` vira `90`. Segundos são arredondados. `null` se for inválido. */
export function isoDurationToMinutes(duration: string): number | null {
  const match = ISO_DURATION.exec(duration);
  // "P" e "PT" casam com a regex, mas não têm nenhum valor.
  if (!match || duration === "P" || duration.endsWith("T")) return null;

  const [, days, hours, minutes, seconds] = match;

  return Math.round(
    Number(days ?? 0) * MINUTES_PER_DAY +
      Number(hours ?? 0) * MINUTES_PER_HOUR +
      Number(minutes ?? 0) +
      Number(seconds ?? 0) / 60,
  );
}

/** `"PT1H30M"` vira `"1h 30min"`, para exibição. Texto vazio se for inválido. */
export function formatDuration(duration: string): string {
  const total = isoDurationToMinutes(duration);
  if (total === null) return "";
  if (total === 0) return "menos de 1min";

  const days = Math.floor(total / MINUTES_PER_DAY);
  const hours = Math.floor((total % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  const minutes = total % MINUTES_PER_HOUR;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}min`);

  return parts.join(" ");
}
