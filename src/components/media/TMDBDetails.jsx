import { useState } from "react";
import { Star, Play, Users, Tv, ChevronDown, ChevronUp, RefreshCw, Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IMG } from "@/lib/tmdb";

// ── Watch Providers ──────────────────────────────────────────────────────────
function ProviderRow({ label, providers, colorClass }) {
  if (!providers || providers.length === 0) return null;
  return (
    <div>
      <p className={`text-xs font-semibold mb-1.5 ${colorClass}`}>{label}</p>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => (
          <div key={p.provider_id} className="flex flex-col items-center gap-1 w-14">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary border border-border shrink-0">
              {p.logo_path ? (
                <img src={IMG.logo(p.logo_path)} alt={p.provider_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Tv className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
            <span className="text-[9px] text-muted-foreground text-center leading-tight line-clamp-2">{p.provider_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WatchSection({ watchProviders }) {
  if (!watchProviders) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Tv className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Onde assistir</h3>
        </div>
        <p className="text-xs text-muted-foreground">Informação de streaming indisponível no Brasil.</p>
      </div>
    );
  }

  const { link, streaming, rent, buy } = watchProviders;
  const hasAny = streaming.length > 0 || rent.length > 0 || buy.length > 0;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Onde assistir</h3>
        </div>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            TMDB <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      {!hasAny ? (
        <p className="text-xs text-muted-foreground">Informação de streaming indisponível no Brasil.</p>
      ) : (
        <div className="space-y-3">
          <ProviderRow label="Streaming" providers={streaming} colorClass="text-primary" />
          <ProviderRow label="Aluguel" providers={rent} colorClass="text-chart-4" />
          <ProviderRow label="Compra" providers={buy} colorClass="text-chart-2" />
        </div>
      )}
    </div>
  );
}

// ── Cast ─────────────────────────────────────────────────────────────────────
export function CastSection({ cast }) {
  if (!cast || cast.length === 0) return null;
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Elenco principal</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
        {cast.map((actor, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary border border-border">
              {actor.photoUrl ? (
                <img src={actor.photoUrl} alt={actor.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                  {actor.name[0]}
                </div>
              )}
            </div>
            <p className="text-[10px] text-center text-foreground font-medium leading-tight line-clamp-2">{actor.name}</p>
            {actor.character && (
              <p className="text-[9px] text-center text-muted-foreground leading-tight line-clamp-1">{actor.character}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Seasons ──────────────────────────────────────────────────────────────────
export function SeasonsSection({ seasons }) {
  const [expanded, setExpanded] = useState(false);
  if (!seasons || seasons.length === 0) return null;

  const filtered = seasons.filter((s) => s.seasonNumber > 0);
  if (filtered.length === 0) return null;

  const visible = expanded ? filtered : filtered.slice(0, 3);

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="font-semibold text-sm mb-3">Temporadas</h3>
      <div className="space-y-2">
        {visible.map((s) => (
          <div key={s.seasonNumber} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/40">
            {s.posterUrl ? (
              <img src={s.posterUrl} alt={s.name} className="w-8 h-10 object-cover rounded shrink-0" />
            ) : (
              <div className="w-8 h-10 bg-secondary rounded shrink-0 flex items-center justify-center">
                <Tv className="w-3 h-3 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{s.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {s.episodeCount} eps{s.airDate ? ` · ${s.airDate.slice(0, 4)}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
      {filtered.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> Mostrar menos</> : <><ChevronDown className="w-3 h-3" /> Ver todas ({filtered.length})</>}
        </button>
      )}
    </div>
  );
}

// ── Update Button ─────────────────────────────────────────────────────────────
export function TMDBUpdateButton({ onUpdate, loading }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onUpdate}
      disabled={loading}
      className="gap-2 text-xs border-border text-muted-foreground hover:text-foreground"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
      Atualizar dados (TMDB)
    </Button>
  );
}

// ── Sinopse ───────────────────────────────────────────────────────────────────
export function OverviewSection({ data }) {
  if (!data?.overview) return null;
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="font-semibold text-sm mb-2">Sinopse</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{data.overview}</p>
      {data.originalTitle && data.originalTitle !== data.title && (
        <p className="text-[11px] text-muted-foreground/60 mt-2">Título original: {data.originalTitle}</p>
      )}
    </div>
  );
}

// ── Info Block ────────────────────────────────────────────────────────────────
export function InfoSection({ data }) {
  if (!data) return null;
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      {data.genres && data.genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.genres.map((g) => (
            <Badge key={g} variant="outline" className="text-[10px] border-border text-muted-foreground">{g}</Badge>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-4 text-xs">
        {data.rating > 0 && (
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-chart-4 text-chart-4" />
            <span className="font-bold text-foreground">{data.rating}</span>
            {data.voteCount > 0 && <span className="text-muted-foreground">({data.voteCount.toLocaleString()} votos)</span>}
          </div>
        )}
        {data.year && <span className="text-muted-foreground">{data.year}</span>}
        {data.status && (
          <span className={`font-medium ${
            data.status === "Em exibição" || data.status === "Lançado" ? "text-primary" :
            data.status === "Finalizado" ? "text-muted-foreground" :
            data.status === "Cancelado" ? "text-destructive" : "text-chart-4"
          }`}>{data.status}</span>
        )}
        {data.numberOfSeasons && (
          <span className="text-muted-foreground">{data.numberOfSeasons} temporada{data.numberOfSeasons !== 1 ? "s" : ""}</span>
        )}
        {data.numberOfEpisodes && (
          <span className="text-muted-foreground">{data.numberOfEpisodes} eps no total</span>
        )}
      </div>
      {data.creators && data.creators.length > 0 && (
        <div className="text-xs">
          <span className="text-muted-foreground">{data.creators[0].role}: </span>
          <span className="text-foreground">{data.creators.map((c) => c.name).join(", ")}</span>
        </div>
      )}
    </div>
  );
}

// ── Trailer Button ────────────────────────────────────────────────────────────
export function TrailerSection({ trailerUrl }) {
  if (!trailerUrl) return null;
  return (
    <a href={trailerUrl} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-colors group">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Play className="w-4 h-4 text-primary fill-primary" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Ver trailer</p>
        <p className="text-[10px] text-muted-foreground">YouTube</p>
      </div>
    </a>
  );
}

// ── Main TMDB Info Block (legacy export kept for compatibility) ────────────────
export default function TMDBDetails({ data, onUpdate, updating }) {
  if (!data || !data.found) return null;
  return (
    <div className="space-y-4">
      <OverviewSection data={data} />
      <InfoSection data={data} />
      <TrailerSection trailerUrl={data.trailerUrl} />
      <CastSection cast={data.cast} />
      <SeasonsSection seasons={data.seasons} />
      <WatchSection watchProviders={data.watchProviders} />
      <div className="flex justify-end">
        <TMDBUpdateButton onUpdate={onUpdate} loading={updating} />
      </div>
    </div>
  );
}