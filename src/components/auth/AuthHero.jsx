import { useState, useEffect } from "react";
import { useLoginBackgrounds } from "@/hooks/useLoginBackgrounds";

const DEV = import.meta.env.DEV;

/**
 * Hero visual do login: imagem de fundo (LoginBackgroundImage) com overlays
 * e texto editorial. A imagem é sorteada uma vez por visita (random per visit).
 * Fallback: gradient escuro com glow verde/purple se nenhuma imagem ativa
 * ou se todas as imagens ativas falharem ao carregar.
 */
export function AuthHero() {
  const { currentImage, activeImages, hasImages, isLoading, isError, error, usingFallback } = useLoginBackgrounds();
  const [displayedUrl, setDisplayedUrl] = useState(null);
  const [imageStatus, setImageStatus] = useState("idle"); // idle | loading | loaded | error
  const [triedUrls, setTriedUrls] = useState(() => new Set());
  const [hideOverlays, setHideOverlays] = useState(false);
  const [directTest, setDirectTest] = useState(false);

  // Quando o hook seleciona uma imagem, exibe-a
  useEffect(() => {
    if (currentImage?.image_url) {
      setDisplayedUrl(currentImage.image_url);
      setTriedUrls(new Set([currentImage.image_url]));
      setImageStatus("loading");
    }
  }, [currentImage]);

  // Se a imagem falhar ao carregar, tenta outra ativa ainda não tentada
  const handleError = () => {
    setImageStatus("error");
    if (!displayedUrl) return;
    const remaining = activeImages.filter((img) => !triedUrls.has(img.image_url));
    if (remaining.length > 0) {
      const idx = Math.floor(Math.random() * remaining.length);
      const next = remaining[idx];
      setDisplayedUrl(next.image_url);
      setTriedUrls((prev) => new Set([...prev, next.image_url]));
      setImageStatus("loading");
    } else {
      // Todas falharam → fallback gradient
      setDisplayedUrl(null);
    }
  };

  // URL para teste direto (DEV): primeira imagem ativa, sem passar pelo hook
  const directUrl = activeImages[0]?.image_url || null;

  const renderUrl = directTest ? directUrl : displayedUrl;

  return (
    <div className="relative h-full min-h-screen w-full overflow-hidden bg-background">
      {/* Fallback gradient (base layer) */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(109,255,60,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(120,80,255,0.05),transparent_50%)]" />

      {/* Background image — apenas a imagem sorteada é baixada */}
      {hasImages && renderUrl && (
        <img
          key={renderUrl}
          src={renderUrl}
          alt=""
          onLoad={() => setImageStatus("loaded")}
          onError={handleError}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ animation: "heroFadeIn 1s ease-in-out" }}
        />
      )}

      {/* Overlays para legibilidade — ocultáveis em DEV para diagnóstico */}
      {!hideOverlays && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </>
      )}

      {/* Painel de debug — SOMENTE em development/preview */}
      {DEV && (
        <div className="absolute top-3 left-3 z-30 bg-background/95 border border-border rounded-lg p-3 text-[10px] font-mono text-foreground space-y-0.5 max-w-xs">
          <div className="font-bold text-primary mb-1">Login Hero Debug</div>
          <div>isLoading: {String(isLoading)}</div>
          <div>isError: {String(isError)}</div>
          {error && <div className="text-destructive">error: {String(error.message || error).slice(0, 80)}</div>}
          <div>images returned: {activeImages.length}</div>
          <div>currentImage id: {currentImage?.id || "null"}</div>
          <div>displayedUrl: {displayedUrl ? displayedUrl.slice(-40) : "null"}</div>
          <div>image status: {imageStatus}</div>
          <div>usingFallback: {String(usingFallback)}</div>
          <div>directTest: {String(directTest)}</div>
          <div className="flex gap-1 mt-1.5">
            <button
              onClick={() => setHideOverlays((v) => !v)}
              className="px-1.5 py-0.5 bg-secondary rounded text-[9px] hover:bg-secondary/70"
            >
              {hideOverlays ? "Show overlays" : "Hide overlays"}
            </button>
            <button
              onClick={() => setDirectTest((v) => !v)}
              className="px-1.5 py-0.5 bg-secondary rounded text-[9px] hover:bg-secondary/70"
            >
              {directTest ? "Hook mode" : "Direct URL test"}
            </button>
          </div>
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