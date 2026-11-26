/** `plural(1, "dia", "dias")` → `"1 dia"`; `plural(3, ...)` → `"3 dias"` */
export function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
