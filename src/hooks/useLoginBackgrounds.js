import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const LAST_BG_KEY = "zoku_last_login_bg_id";

/**
 * Fallback de imagens de login — usadas quando a query falha por auth
 * (app Privado bloqueia acesso anônimo à API, mesmo com RLS read: {}).
 * Mesmo padrão de useSiteConfig (FALLBACK_LOGO_*).
 * Estas URLs de arquivo público são acessíveis anonimamente.
 */
const FALLBACK_LOGIN_BGS = [
  "https://base44.app/api/apps/69f36ad625ae768ae51fc819/files/mp/public/69f36ad625ae768ae51fc819/4b38d5f49_WhatsAppImage2026-09-07at103824PM.jpeg",
  "https://base44.app/api/apps/69f36ad625ae768ae51fc819/files/mp/public/69f36ad625ae768ae51fc819/8e6dd67b3_WhatsAppImage12026-09-07at103824PM.jpeg",
  "https://base44.app/api/apps/69f36ad625ae768ae51fc819/files/mp/public/69f36ad625ae768ae51fc819/48c4e4844_WhatsAppImage22026-09-07at103824PM.jpeg",
  "https://base44.app/api/apps/69f36ad625ae768ae51fc819/files/mp/public/69f36ad625ae768ae51fc819/977e05347_WhatsAppImage32026-09-07at103824PM.jpeg",
  "https://base44.app/api/apps/69f36ad625ae768ae51fc819/files/mp/public/69f36ad625ae768ae51fc819/edab9acee_WhatsAppImage42026-09-07at103824PM.jpeg",
];

/**
 * Busca imagens ativas de LoginBackgroundImage e seleciona UMA aleatoriamente
 * por visita à página de login.
 *
 * ROOT CAUSE: O app é Privado → a API retorna 403 para requests anônimos,
 * bloqueando a query mesmo com RLS read: {}. Quando a query falha (isError),
 * usa FALLBACK_LOGIN_BGS para que o hero nunca fique sem imagem.
 *
 * Para que as imagens gerenciadas no Admin apareçam deslogado, é necessário
 * mudar a visibilidade do app para Pública (dashboard → App Settings).
 *
 * LOGIN_HERO_SELECTION = RANDOM_PER_VISIT
 * ACTIVE_IMAGES_ONLY = true
 * NO_SLIDESHOW = true
 */
export function useLoginBackgrounds() {
  const { data: images = [], isLoading, isError, error } = useQuery({
    queryKey: ["login-bg-active"],
    queryFn: async () => {
      const all = await base44.entities.LoginBackgroundImage.list("order", 200);
      return all.filter((img) => img.active && img.image_url);
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Se a query falhou (403 app privado), usa fallbacks para não ficar sem imagem.
  // Se a query succeeded com 0 imagens, admin desativou todas → sem fallback.
  const effectiveImages =
    isError && images.length === 0
      ? FALLBACK_LOGIN_BGS.map((url, i) => ({
          id: `fallback-${i}`,
          image_url: url,
          active: true,
          title: `Fallback ${i + 1}`,
        }))
      : images;

  const [selectedImage, setSelectedImage] = useState(null);
  const hasSelectedRef = useRef(false);

  useEffect(() => {
    if (hasSelectedRef.current) return;
    if (effectiveImages.length === 0) return;

    hasSelectedRef.current = true;

    let pool = effectiveImages;

    if (pool.length > 1) {
      const lastId = sessionStorage.getItem(LAST_BG_KEY);
      if (lastId) {
        const filtered = pool.filter((img) => img.id !== lastId);
        if (filtered.length > 0) pool = filtered;
      }
    }

    const idx = Math.floor(Math.random() * pool.length);
    const chosen = pool[idx];
    setSelectedImage(chosen);
    sessionStorage.setItem(LAST_BG_KEY, chosen.id);
  }, [effectiveImages]);

  return {
    currentImage: selectedImage,
    activeImages: effectiveImages,
    hasImages: effectiveImages.length > 0,
    isLoading,
    isError,
    error,
    usingFallback: isError && images.length === 0,
  };
}