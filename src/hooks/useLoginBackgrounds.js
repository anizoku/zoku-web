import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Busca imagens ativas de LoginBackgroundImage e seleciona uma por hora
 * de forma determinística (currentHour % activeImages.length).
 * Atualiza automaticamente quando a hora muda (crossfade no componente).
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

  const [hour, setHour] = useState(() => new Date().getHours());

  // Verifica mudança de hora a cada 60s (para crossfade automático)
  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      const now = new Date().getHours();
      setHour((prev) => (prev !== now ? now : prev));
    }, 60000);
    return () => clearInterval(interval);
  }, [images.length]);

  const activeImages = images;
  const currentIndex = activeImages.length > 0 ? hour % activeImages.length : -1;
  const nextIndex = activeImages.length > 1 ? (currentIndex + 1) % activeImages.length : -1;

  const currentImage = currentIndex >= 0 ? activeImages[currentIndex] : null;
  const nextImage = nextIndex >= 0 ? activeImages[nextIndex] : null;

  return {
    currentImage,
    nextImage,
    hasImages: activeImages.length > 0,
    isLoading,
  };
}