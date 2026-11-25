import useSWR from "swr";
import { ApiError } from "@/services/api";
import { getGroup } from "@/services/groups-api";

/**
 * Detalhe do grupo. A tela do grupo, a de Sobre e a de edição usam a mesma
 * chave, então atualizar uma atualiza as outras.
 */
export function useGroup(groupId: string) {
  const swr = useSWR(`/groups/${groupId}`, () => getGroup(groupId));

  return {
    ...swr,
    // 404: o grupo foi apagado ou a pessoa não participa mais dele
    notFound: swr.error instanceof ApiError && swr.error.status === 404,
  };
}
