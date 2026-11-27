import { request, toQueryString } from "@/services/api";
import type {
  StatisticsParams,
  UserStatistics,
} from "@/services/types/statistics";

export function getUserStatistics({
  mode,
  days,
}: StatisticsParams = {}): Promise<UserStatistics> {
  return request<UserStatistics>(
    `/user/statistics${toQueryString({ mode, days })}`,
  );
}
