import { useState, useEffect } from "react";
import { Loader2, Tv, ExternalLink } from "lucide-react";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TOKEN = import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN;

async function tmdbFetch(path) {
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Erro TMDB: ${res.status}`);
  return res.json();
}

export async function getWatchProviders(title, type) {
  if (!TOKEN) throw new Error("Token TMDB não configurado.");

  const searchData = await tmdbFetch(
    `/search/${type}?query=${encodeURIComponent(title)}&language=pt-BR`
  );

  const results = searchData.results || [];
  if (!results.length) return { found: false };

  const normalizedTitle = title.toLowerCase().trim();
  const best =
    results.find((r) => (r.title || r.name || "").toLowerCase() === normalizedTitle) ||
    results[0];

  const tmdbId = best.id;
  const foundTitle = best.title || best.name || title;

  const providersData = await tmdbFetch(`/${type}/${tmdbId}/watch/providers`);
  const br = providersData.results?.BR;

  return {
    found: true,
    tmdbId,
    title: foundTitle,
    country: "BR",
    link: br?.link || null,
    streaming: br?.flatrate || [],
    rent: br?.rent || [],
    buy: br?.buy || [],
    noData: !br,
  };
}

function ProviderLogo({ provider }) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-16">
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary border border-border shrink-0">
        {provider.logo_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
            alt={provider.provider_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tv className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-2">
        {provider.provider_name}
      </span>
    </div>
  );
}

function ProviderCategory({ label, providers, colorClass }) {
  if (!providers || providers.length === 0) return null;
  return (
    <div>
      <p className={`text-xs font-semibold mb-2 ${colorClass}`}>{label}</p>
      <div className="flex flex-wrap gap-3">
        {providers.map((p) => (
          <ProviderLogo key={p.provider_id} provider={p} />
        ))}
      </div>
    </div>
  );
}

export default function WhereToWatchWidget({ title, type }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!title || !type) return;
    setLoading(true);
    setError(null);
    setData(null);

    getWatchProviders(title, type)
      .then(setData)
      .catch((err) => setError(err.message || "Erro ao buscar provedores."))
      .finally(() => setLoading(false));
  }, [title, type]);

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">Onde assistir</h2>
        </div>
        {data?.link && (
          <a
            href={data.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
          >
            Ver no TMDB <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Buscando provedores...</span>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive py-2">{error}</p>
      )}

      {!loading && !error && data && !data.found && (
        <p className="text-xs text-muted-foreground py-2">Obra não encontrada no TMDB.</p>
      )}

      {!loading && !error && data?.found && data.noData && (
        <p className="text-xs text-muted-foreground py-2">
          Informação de streaming indisponível no Brasil.
        </p>
      )}

      {!loading && !error && data?.found && !data.noData && (
        <div className="space-y-4">
          <ProviderCategory
            label="Streaming"
            providers={data.streaming}
            colorClass="text-primary"
          />
          <ProviderCategory
            label="Aluguel"
            providers={data.rent}
            colorClass="text-chart-4"
          />
          <ProviderCategory
            label="Compra"
            providers={data.buy}
            colorClass="text-chart-2"
          />
        </div>
      )}
    </div>
  );
}