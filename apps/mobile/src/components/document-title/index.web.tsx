import { useSegments } from "expo-router";
import { useEffect } from "react";
import { formatPageTitle, titleForSegments } from "@/config/page-titles";
import { useFocusedPageTitle } from "@/hooks/usePageTitle";

/**
 * Mantém o título da aba do navegador (PWA) em dia com a rota. Fica uma vez
 * só, na raiz: vários `<Head>` montados ao mesmo tempo (telas atrás na pilha)
 * disputavam o título. A tela em foco pode trocar pelo nome carregado com
 * `usePageTitle`.
 */
export default function DocumentTitle() {
  const segments = useSegments();
  const focusedTitle = useFocusedPageTitle();
  const title = focusedTitle
    ? formatPageTitle(focusedTitle)
    : titleForSegments(segments);

  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}
