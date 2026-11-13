import { useCallback } from "react";
import useSWR from "swr";
import { getErrorMessage, getFieldErrors } from "@/services/api-errors";
import { getUserStatistics } from "@/services/statistics-api";
import type { StatisticsMode } from "@/services/types/statistics";

export const MIN_DAYS = 1;
export const MAX_DAYS = 365;

export function isValidDays(days: number): boolean {
  return Number.isInteger(days) && days >= MIN_DAYS && days <= MAX_DAYS;
}

interface Filters {
  mode?: StatisticsMode;
  days?: number;
}

export function useUserStatistics({ mode = "calendar", days = 30 }: Filters) {
  // A chave muda com os filtros, então o SWR descarta respostas de filtros antigos
  const { data, error, mutate } = useSWR(
    isValidDays(days) ? ["/user/statistics", mode, days] : null,
    () => getUserStatistics({ mode, days }),
    { keepPreviousData: true },
  );

  const refetch = useCallback(() => mutate(), [mutate]);
  const { mode: modeError, days: daysError } = getFieldErrors(error);

  let status: "loading" | "error" | "success" = "loading";
  if (error) status = "error";
  else if (data) status = "success";

  return {
    data,
    status,
    error: error ? getErrorMessage(error) : null,
    fieldErrors: { mode: modeError, days: daysError },
    refetch,
  };
}
