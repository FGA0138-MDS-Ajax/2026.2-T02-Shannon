// A API usa datas sem horário no formato `YYYY-MM-DD`. As conversões abaixo
// usam a data local: `toISOString` usaria UTC e viraria o dia às 21h no Brasil.

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** `Date` → `"2026-10-28"` */
export function toApiDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `"2026-10-28"` → `Date` à meia-noite local */
export function parseApiDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** `Date` → `"28/10/2026"` */
export function formatDate(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Data e hora ISO em UTC (ex.: `created_at` do check-in) → `"28/10/2026 às 07:30"` no fuso do aparelho */
export function formatDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return `${formatDate(date)} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
