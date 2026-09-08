import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const LAST_BG_KEY = "zoku_last_login_bg_id";

/**
 * Busca imagens ativas de LoginBackgroundImage e seleciona UMA aleatoriamente
 * por visita à página de login. A imagem não muda durante a mesma visita
 * (re-renders, troca de modo login/signup/forgot, digitação, etc.).
 *
 * LOGIN_HERO_SELECTION = RANDOM_PER_VISIT
 * ACTIVE_IMAGES_ONLY = true
 * NO_SLIDESHOW = true
 */
export function useLoginBackgrounds() {
  const { data: images = [], isLoading } = useQuery({
    queryKey: ["login-bg-active"],
    queryFn: async () => {
      const all = await base44.entities.LoginBackgroundImage.list("order", 200);
      return all.filter((img) => img.active && img.image_url);
    },
    staleTime: 5 * 60 * 1000,
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const hasSelectedRef = useRef(false);

  // Seleciona UMA imagem quando a lista carrega pela primeira vez nesta visita.
  // hasSelectedRef garante que não haja novo sorteio em re-renders ou refetch.
  useEffect(() => {
    if (hasSelectedRef.current) return;
    if (images.length === 0) return;

    hasSelectedRef.current = true;

    let pool = images;

    // Evitar repetição imediata da visita anterior (somente ID, nunca base64)
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
  }, [images]);

  return {
    currentImage: selectedImage,
    activeImages: images,
    hasImages: images.length > 0,
    isLoading,
  };
}