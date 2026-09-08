import { useLoginBackgrounds } from "@/hooks/useLoginBackgrounds";

/**
 * Hero visual do login: imagem de fundo (LoginBackgroundImage) com overlays
 * e texto editorial. Crossfade suave quando a imagem muda (por hora).
 * Fallback: gradient escuro com glow verde/purple se nenhuma imagem ativa.
 */
export function AuthHero() {
  const { currentImage, nextImage, hasImages } = useLoginBackgrounds();

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      {/* Fallback gradient (base layer) */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(109,255,60,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(120,80,255,0.05),transparent_50%)]" />

      {/* Background image com crossfade */}
      {hasImages && currentImage && (
        <img
          key={currentImage.image_url}
          src={currentImage.image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ animation: "heroFadeIn 1s ease-in-out" }}
        />
      )}

      {/* Overlays para legibilidade */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

      {/* Preload próxima imagem */}
      {nextImage && nextImage.image_url !== currentImage?.image_url && (
        <img src={nextImage.image_url} alt="" className="hidden" loading="lazy" />
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