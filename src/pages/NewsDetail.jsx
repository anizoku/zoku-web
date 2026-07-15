import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft, Newspaper, Clock, ExternalLink, MessageCircle,
  Share2, Copy, Check, ImageOff, Loader2,
} from "lucide-react";
import SeoMeta from "@/components/news/SeoMeta";
import {
  categoryLabels, getArticleImage, formatDatePT, timeAgo,
} from "@/lib/news";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function NewsDetail() {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: news, isLoading } = useQuery({
    queryKey: ["news-detail", slug],
    queryFn: async () => {
      // Tenta por slug
      let items = await base44.entities.News.filter({ slug }, "-published_at", 5);
      let n = items?.[0];
      // Fallback por id
      if (!n) {
        try { n = await base44.entities.News.get(slug); } catch { n = null; }
      }
      if (!n || n.status !== "publicado") return null;
      return n;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  const cat = news?.category || "general";
  const { data: more = [] } = useQuery({
    queryKey: ["news-more", cat, slug],
    queryFn: async () => {
      const list = await base44.entities.News.filter({ status: "publicado", category: cat }, "-published_at", 20);
      return (list || []).filter(n => n.slug !== slug).slice(0, 4);
    },
    enabled: !!news,
    staleTime: 5 * 60 * 1000,
  });

  usePageTitle(news?.title || "Notícia");

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = news?.title ? `${news.title} — ZOKU` : "ZOKU";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!news) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Newspaper className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <h1 className="font-space font-bold text-xl text-foreground mb-2">Notícia não encontrada</h1>
        <p className="text-sm text-muted-foreground mb-6">
          A notícia que você procura não existe ou foi removida.
        </p>
        <Link to="/noticias" className="inline-flex items-center gap-2 text-primary text-sm hover:underline">
          <ArrowLeft className="w-4 h-4" /> Voltar para Notícias
        </Link>
      </div>
    );
  }

  const cover = getArticleImage(news);

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
      <SeoMeta
        title={news.title}
        description={news.summary || ""}
        image={cover}
        type="article"
        publishedTime={news.published_at}
      />

      <Link to="/noticias" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Notícias
      </Link>

      {/* Capa */}
      {cover ? (
        <div className="w-full aspect-[1200/630] rounded-xl overflow-hidden bg-card border border-border mb-5">
          <img src={cover} alt={news.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full aspect-[1200/630] rounded-xl overflow-hidden bg-secondary flex items-center justify-center mb-5">
          <ImageOff className="w-8 h-8 text-muted-foreground/40" />
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold uppercase tracking-wider">
          {categoryLabels[news.category] || "Geral"}
        </span>
      </div>
      <h1 className="font-space font-bold text-2xl sm:text-3xl text-foreground leading-tight mb-3">
        {news.title}
      </h1>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-6 flex-wrap">
        {news.author_name && <span className="font-medium text-foreground/80">{news.author_name}</span>}
        <span>•</span>
        <span>{formatDatePT(news.published_at)}</span>
        {news.reading_minutes > 0 && (
          <>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {news.reading_minutes} min de leitura</span>
          </>
        )}
      </div>

      {/* Conteúdo */}
      {news.content ? (
        <article className="prose prose-sm prose-invert max-w-none text-foreground/90 leading-relaxed mb-8
          [&_p]:my-3 [&_h2]:font-space [&_h2]:text-lg [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-space [&_h3]:text-base [&_img]:rounded-lg [&_a]:text-primary">
          <ReactMarkdown>{news.content}</ReactMarkdown>
        </article>
      ) : news.summary ? (
        <p className="text-sm text-foreground/80 leading-relaxed mb-8">{news.summary}</p>
      ) : null}

      {/* Fontes */}
      {Array.isArray(news.sources) && news.sources.length > 0 ? (
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            📰 Fontes:
          </p>
          <ul className="space-y-1.5">
            {news.sources.map((s, i) => (
              <li key={i} className="flex items-center gap-1.5 text-sm">
                <span className="text-muted-foreground">{s.name}</span>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                    <ExternalLink className="w-3 h-3" /> abrir
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : news.source_url ? (
        <div className="bg-card rounded-xl border border-border p-4 mb-6 text-sm">
          <a href={news.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1.5">
            📰 {news.source_name || "Ver fonte original"} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ) : null}

      {/* Compartilhamento */}
      <div className="flex items-center gap-2 py-4 border-t border-border mb-8">
        <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1"><Share2 className="w-3.5 h-3.5" /> Compartilhar:</span>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-xs text-foreground transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-xs text-foreground transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> X
        </a>
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-xs text-foreground transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado!" : "Copiar link"}
        </button>
      </div>

      {/* Mais notícias */}
      {more.length > 0 && (
        <div>
          <h2 className="font-space font-bold text-lg text-foreground mb-3">Mais notícias</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {more.map((n) => {
              const img = n.card_image_url || n.image_url;
              return (
                <Link
                  key={n.id}
                  to={`/noticias/${n.slug}`}
                  className="flex gap-3 bg-card rounded-xl border border-border p-2.5 hover:border-primary/40 transition-colors group"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary shrink-0">
                    {img ? (
                      <img src={img} alt={n.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                      {categoryLabels[n.category] || "Geral"}
                    </span>
                    <p className="text-xs font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {n.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(n.published_at)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}