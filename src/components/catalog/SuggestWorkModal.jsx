import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useCatalog } from "@/contexts/CatalogContext";
import { useQuery } from "@tanstack/react-query";
import { searchAnime, searchManga } from "@/lib/jikan";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Star, ExternalLink, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { isCategoryFrozen, ACTIVE_CATEGORIES } from "@/lib/scopeConfig";

function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default function SuggestWorkModal({ open, onClose, workType = "anime" }) {
  // If requested type is frozen, fall back to first active category
  const effectiveWorkType = isCategoryFrozen(workType) ? (ACTIVE_CATEGORIES[0] || "anime") : workType;
  const [step, setStep] = useState("search"); // search | results | confirm | success
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { catalog } = useCatalog();

  // Fetch existing suggestions to detect duplicates
  const { data: mysuggestions = [] } = useQuery({
    queryKey: ["my-suggestions"],
    queryFn: () => base44.entities.WorkSuggestion.list("-created_at", 100),
    enabled: open,
  });

  // Check if mal_id already in catalog
  function isInCatalog(malId) {
    return catalog.some(
      (w) => w.mal_id === malId || w.manga_mal_id === malId
    );
  }

  function getCatalogSlug(malId) {
    const item = catalog.find((w) => w.mal_id === malId || w.manga_mal_id === malId);
    return item ? item.slug : null;
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const fn = effectiveWorkType === "anime" ? searchAnime : searchManga;
      const data = await fn(query.trim());
      setResults(data);
      setStep("results");
    } catch (e) {
      if (e.message === "rate_limit") {
        setError("Muitas buscas em pouco tempo. Aguarde alguns segundos e tente novamente.");
      } else {
        setError("Erro ao buscar. Verifique sua conexão e tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!selected) return;
    setSubmitting(true);

    // Check duplicate pending suggestion
    const alreadyPending = mysuggestions.find(
      (s) => s.mal_id === selected.mal_id && s.suggestion_status === "pending"
    );
    if (alreadyPending) {
      setError("Você já sugeriu esta obra e ela está aguardando avaliação.");
      setSubmitting(false);
      return;
    }

    const me = await base44.auth.me();
    await base44.entities.WorkSuggestion.create({
      suggested_by_email: me.email,
      title: selected.title?.romaji || selected.title?.english || selected.title,
      type: effectiveWorkType,
      mal_id: selected.mal_id,
      image_url: selected.images?.jpg?.large_image_url || selected.images?.jpg?.image_url || "",
      synopsis: (selected.synopsis || "").slice(0, 500),
      year: selected.year || selected.published?.prop?.from?.year || null,
      score: selected.score || null,
      status: selected.status || "",
      episodes: selected.episodes || null,
      chapters: selected.chapters || null,
      genres: (selected.genres || []).map((g) => g.name).join(", "),
      mal_url: selected.url || "",
      suggestion_status: "pending",
      created_at: new Date().toISOString(),
    });

    setStep("success");
    setSubmitting(false);
  }

  function handleClose() {
    setStep("search");
    setQuery("");
    setResults([]);
    setSelected(null);
    setError(null);
    onClose();
  }

  const getTitle = (item) =>
    item.title_english || item.title || item.title_romaji || "Sem título";

  const getYear = (item) =>
    item.year || item.aired?.prop?.from?.year || item.published?.prop?.from?.year || "—";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-space flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Sugerir {effectiveWorkType === "anime" ? "Anime" : "Mangá"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* STEP: search */}
          {(step === "search" || step === "results") && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder={`Digite o nome do ${effectiveWorkType === "anime" ? "anime" : "mangá"}...`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-secondary border-none"
                />
                <Button onClick={handleSearch} disabled={loading || !query.trim()} className="shrink-0">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Buscar
                </Button>
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}

              {step === "results" && (
                <>
                  {results.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhum resultado encontrado. Tente um título diferente.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {results.map((item) => {
                        const inCatalog = isInCatalog(item.mal_id);
                        const slug = getCatalogSlug(item.mal_id);
                        return (
                          <div
                            key={item.mal_id}
                            className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3 border border-border"
                          >
                            <img
                              src={item.images?.jpg?.image_url || ""}
                              alt={getTitle(item)}
                              className="w-12 h-16 object-cover rounded-lg shrink-0 bg-secondary"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground leading-tight truncate">
                                {getTitle(item)}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[10px] text-muted-foreground">{item.type || workType}</span>
                                <span className="text-[10px] text-muted-foreground">{getYear(item)}</span>
                                <span className="text-[10px] text-muted-foreground">{item.status}</span>
                                {item.score > 0 && (
                                  <span className="text-[10px] flex items-center gap-0.5 text-chart-4">
                                    <Star className="w-2.5 h-2.5 fill-chart-4" />{item.score}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0">
                              {inCatalog ? (
                                <div className="flex flex-col items-end gap-1">
                                  <Badge className="text-[10px] bg-primary/15 text-primary border-none">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />Já no catálogo
                                  </Badge>
                                  {slug && (
                                    <Link
                                      to={`/obra/${slug}?tipo=${workType}`}
                                      className="text-[10px] text-primary/70 hover:text-primary underline"
                                      onClick={handleClose}
                                    >
                                      Ver obra
                                    </Link>
                                  )}
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-8 border-primary/30 text-primary hover:bg-primary/10"
                                  onClick={() => { setSelected(item); setError(null); setStep("confirm"); }}
                                >
                                  Sugerir
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP: confirm */}
          {step === "confirm" && selected && (
            <div className="space-y-4">
              <button
                onClick={() => { setStep("results"); setError(null); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-3 h-3" /> Voltar aos resultados
              </button>

              <div className="flex gap-4 bg-secondary/40 rounded-xl p-4 border border-border">
                <img
                  src={selected.images?.jpg?.large_image_url || selected.images?.jpg?.image_url || ""}
                  alt={getTitle(selected)}
                  className="w-24 h-36 object-cover rounded-lg shrink-0 bg-secondary"
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <h3 className="font-space font-bold text-base text-foreground leading-tight">
                    {getTitle(selected)}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] border-border">{selected.type || workType}</Badge>
                    {selected.score > 0 && (
                      <span className="text-xs flex items-center gap-0.5 text-chart-4">
                        <Star className="w-3 h-3 fill-chart-4" />{selected.score}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{getYear(selected)}</span>
                  </div>
                  {selected.genres?.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {selected.genres.map((g) => g.name).join(" · ")}
                    </p>
                  )}
                  {(selected.episodes || selected.chapters) && (
                    <p className="text-xs text-muted-foreground">
                      {selected.episodes ? `${selected.episodes} episódios` : `${selected.chapters} capítulos`}
                    </p>
                  )}
                  {selected.synopsis && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {selected.synopsis}
                    </p>
                  )}
                  {selected.url && (
                    <a
                      href={selected.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary/70 hover:text-primary flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Ver no MAL
                    </a>
                  )}
                </div>
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setStep("results")}>Voltar</Button>
                <Button onClick={handleConfirm} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Confirmar sugestão
                </Button>
              </div>
            </div>
          )}

          {/* STEP: success */}
          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="font-space font-bold text-lg text-foreground">Sugestão enviada!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sua sugestão foi enviada! O admin avaliará em breve.
                </p>
              </div>
              <Button onClick={handleClose}>Fechar</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}