import { useState } from "react";

/**
 * Último valor não nulo. Uma folha recebe `null` para fechar e, sem isto, o
 * conteúdo sumiria antes de a animação de saída terminar.
 */
export function useLastDefined<T>(value: T | null | undefined): T | undefined {
  const [last, setLast] = useState(value ?? undefined);
  if (value != null && value !== last) setLast(value);
  return value ?? last;
}
