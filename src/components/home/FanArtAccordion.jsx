import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Instagram, Twitter, Globe, ImageOff, ChevronDown } from "lucide-react";

function buildUrl(value, platform) {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (platform) {
    const handle = v.startsWith("@") ? v.slice(1) : v;
    return `https://${platform}.com/${handle}`;
  }
  return `https://${v}`;
}

/**
 * Overlay inferior com título, artista, redes e botão "Ver obra".
 * Usado tanto no painel aberto (desktop) quanto no item aberto (mobile).
 */
function ArtOverlay({ art, title }) {
  const ig = buildUrl(art.artist_instagram, "instagram");
  const tw = buildUrl(art.artist_twitter, "twitter");
  const web = buildUrl(art.artist_website, null);

  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5 space-y-1.5">
        <h4 className="font-space font-bold text-lg text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground">por {art.artist_name || "Artista"}</p>
        {art.work_title && (
          <p className="text-xs text-primary">Relacionado a {art.work_title}</p>
        )}
        <div className="flex items-center gap-3 pt-1.5">
          {ig && (
            <a
              href={ig}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram do artista"
              className="text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
            >
              <Instagram className="w-4 h-4" />
            </a>
          )}
          {tw && (
            <a
              href={tw}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter do artista"
              className="text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
            >
              <Twitter className="w-4 h-4" />
            </a>
          )}
          {web && (
            <a
              href={web}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Site do artista"
              className="text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
            >
              <Globe className="w-4 h-4" />
            </a>
          )}
          {art.work_slug && (
            <Link
              to={`/obra/${art.work_slug}`}
              className="ml-2 inline-flex items-center text-xs text-primary border border-primary/30 rounded-full px-3 py-1 hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Ver obra
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Imagem com fallback ImageOff em caso de erro.
 */
function ArtImage({ src, alt, className }) {
  const [error, setError] = useState(false);
  if (error || !src) {
    return (
      <div className={`flex items-center justify-center bg-secondary ${className}`}>
        <ImageOff className="w-8 h-8 text-muted-foreground/40" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}

/**
 * Accordion visual da galeria de Arte de Fãs.
 * Desktop: accordion horizontal — uma arte aberta + abas estreitas laterais.
 * Mobile: accordion vertical — cabeçalho + painel aberto.
 *
 * Animação via CSS transitions (transition-all duration-300 ease-out)
 * — sem dependência de motion adicionada.
 */
export default function FanArtAccordion({ arts, isLoading }) {
  const [openArtId, setOpenArtId] = useState(null);

  // Garante openArtId válido quando arts muda
  useEffect(() => {
    if (arts.length > 0 && !arts.some((a) => a.id === openArtId)) {
      setOpenArtId(arts[0].id);
    }
  }, [arts, openArtId]);

  if (isLoading) {
    return (
      <>
        {/* Desktop skeleton */}
        <div className="hidden lg:flex gap-2 h-[460px]">
          <div className="flex-1 bg-card rounded-xl animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-14 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
        {/* Mobile skeleton */}
        <div className="lg:hidden space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-xl animate-pulse h-14" />
          ))}
        </div>
      </>
    );
  }

  if (arts.length === 0) return null;

  return (
    <>
      {/* Desktop: accordion horizontal */}
      <div className="hidden lg:flex gap-2 h-[460px]">
        {arts.map((art) => {
          const isOpen = art.id === openArtId;
          const title = art.title || art.work_title || "Arte de fã";

          if (isOpen) {
            return (
              <div
                key={art.id}
                id={`fanart-panel-${art.id}`}
                className="relative rounded-xl overflow-hidden border border-border transition-all duration-300 ease-out"
                style={{ flexGrow: 1, flexBasis: 0 }}
              >
                <ArtImage
                  src={art.image_url}
                  alt={title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <ArtOverlay art={art} title={title} />
              </div>
            );
          }

          return (
            <button
              key={art.id}
              onClick={() => setOpenArtId(art.id)}
              aria-expanded={false}
              aria-controls={`fanart-panel-${art.id}`}
              className="relative rounded-xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              style={{ flexGrow: 0, flexBasis: 56, minWidth: 56 }}
            >
              {/* Miniatura faint da arte */}
              {art.image_url && (
                <img
                  src={art.image_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-25"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-card/70 to-card/95" />
              {/* Título vertical */}
              <div className="absolute inset-0 flex items-center justify-center p-2">
                <span className="[writing-mode:vertical-rl] text-xs font-medium text-foreground/80 truncate max-h-full">
                  {title}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile/tablet: accordion vertical */}
      <div className="lg:hidden space-y-2">
        {arts.map((art) => {
          const isOpen = art.id === openArtId;
          const title = art.title || art.work_title || "Arte de fã";

          return (
            <div key={art.id} className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setOpenArtId(art.id)}
                aria-expanded={isOpen}
                aria-controls={`fanart-panel-${art.id}`}
                className="w-full flex items-center gap-3 p-3 bg-card hover:bg-secondary/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary shrink-0">
                  <ArtImage src={art.image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    por {art.artist_name || "Artista"}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div id={`fanart-panel-${art.id}`} className="relative h-[300px]">
                  <ArtImage
                    src={art.image_url}
                    alt={title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <ArtOverlay art={art} title={title} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}