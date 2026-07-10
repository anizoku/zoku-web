import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { scrollMemory } from "@/lib/scrollMemory";

/**
 * Substitui o ScrollToTop. Em vez de sempre ir ao topo:
 * - salva a posição de scroll de cada pathname enquanto o usuário navega/rola;
 * - ao voltar para um pathname já visitado, restaura a posição salva;
 * - para um pathname novo, vai ao topo (comportamento padrão).
 * O botão "Início" chama scrollMemory.requestReset() para limpar tudo.
 */
export default function ScrollMemory() {
  const { pathname } = useLocation();
  const lastScrollTop = useRef(0);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    // Reset intencional (ex: clique em "Início") → limpa tudo e não restaura.
    const wasReset = scrollMemory.consumeReset();

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        lastScrollTop.current = main.scrollTop;
        scrollMemory.set(pathname, main.scrollTop);
        ticking = false;
      });
    };
    main.addEventListener("scroll", onScroll, { passive: true });

    const saved = wasReset ? null : scrollMemory.get(pathname);
    const target = saved ?? 0;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        main.scrollTo({ top: target, behavior: "instant" });
        lastScrollTop.current = target;
      })
    );

    return () => {
      // Não re-salva a página que está sendo deixada se um reset foi solicitado.
      if (!scrollMemory.isResetRequested()) {
        scrollMemory.set(pathname, lastScrollTop.current);
      }
      main.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  return null;
}