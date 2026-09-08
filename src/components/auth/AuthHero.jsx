import { useState, useEffect } from "react";
import { useLoginBackgrounds } from "@/hooks/useLoginBackgrounds";

/**
 * Hero visual do login: imagem de fundo (LoginBackgroundImage) com overlays
 * e texto editorial. A imagem é sorteada uma vez por visita (random per visit).
 * Fallback: gradient escuro com glow verde/purple se nenhuma imagem ativa
 * ou se todas as imagens ativas falharem ao carregar.
 */
export function AuthHero() {
  const { currentImage, activeImages, hasImages, isError } = useLoginBackgrounds();
  const [displayedUrl, setDisplayedUrl] = useState(null);
  const [triedUrls, setTriedUrls] = useState(() => new Set());

  // Quando o hook seleciona uma imagem, exibe-a
  useEffect(() => {
    if (currentImage?.image_url) {
      setDisplayedUrl(currentImage.image_url);
      setTriedUrls(new Set([currentImage.image_url]));
    }
  }, [currentImage]);

  // Se a imagem falhar ao carregar, tenta outra ativa ainda não tentada
  const handleError = () => {
    if (!displayedUrl) return;
    const remaining = activeImages.filter((img) => !triedUrls.has(img.image_url));
    if (remaining.length > 0) {
      const idx = Math.floor(Math.random() * remaining.length);
      const next = remaining[idx];
      setDisplayedUrl(next.image_url);
      setTriedUrls((prev) => new Set([...prev, next.image_url]));
    } else {
      // Todas falharam → fallback gradient
      setDisplayedUrl(null);
    }
  };

  return (
    <div className="relative h-full min-h-screen w-full overflow-hidden bg-background">
      {/* Fallback gradient (base layer) */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(109,255,60,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(120,80,255,0.05),transparent_50%)]" />

      {/* Background image — apenas a imagem sorteada é baixada */}
      {hasImages && displayedUrl && (
        <img
          key={displayedUrl}
          src={displayedUrl}
          alt=""
          onError={handleError}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ animation: "heroFadeIn 1s ease-in-out" }}
        />
      )}

      {/* Overlays para legibilidade */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

      {/* Debug discreto — somente em development (nunca em produção) */}
      {import.meta.env.DEV && isError && (
        <div className="absolute top-3 left-3 z-20 bg-destructive/90 text-destructive-foreground text-[10px] px-2 py-1 rounded">
          Login backgrounds unavailable
        </div>
      )}

      {/* Texto editorial — desktop only */}
      <div className="hidden lg:flex absolute bottom-10 left-10 right-10 z-10 flex-col">
        <span className="text-primary text-xs font-bold tracking-[0.25em] mb-4">ZOKU</span>
        <h2 className="font-space font-bold text-3xl xl:text-4xl text-foreground mb-2 max-w-md leading-tight">
          Seu universo anime começa aqui.
        </h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Acompanhe o que você assiste, descubra novas histórias e conecte-se com outros fãs.
        </p>
      </div>
    </div>
  );
}