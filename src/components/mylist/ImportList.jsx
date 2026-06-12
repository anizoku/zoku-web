import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { CATALOG } from "@/lib/catalog";
import { base44 } from "@/api/base44Client";

const STATUS_MAP_MAL = {
  Watching: "watching",
  "Plan to Watch": "planned",
  Completed: "completed",
  "On-Hold": "on_hold",
  Dropped: "dropped",
  Reading: "reading",
  "Plan to Read": "planned",
};

const STATUS_LABEL = {
  watching: "Assistindo", reading: "Lendo", completed: "Concluído",
  planned: "Planejado", dropped: "Dropado", on_hold: "Pausado",
};

// Find a catalog work by title (fuzzy match)
function findCatalogWork(title) {
  if (!title) return null;
  const norm = (s) => (s || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const normTitle = norm(title);
  return CATALOG.find((w) => norm(w.title) === normTitle) || null;
}

// Parse MAL XML export
function parseMALXML(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error("Arquivo XML inválido.");

  const entries = [];

  // Anime entries
  doc.querySelectorAll("anime").forEach((node) => {
    const title = node.querySelector("series_title")?.textContent || node.querySelector("series_animetitle")?.textContent;
    const status = node.querySelector("my_status")?.textContent;
    const episodes = parseInt(node.querySelector("my_watched_episodes")?.textContent || "0");
    const score = parseInt(node.querySelector("my_score")?.textContent || "0");
    const malId = node.querySelector("series_animedb_id")?.textContent;
    if (title) {
      entries.push({ title, type: "anime", status: STATUS_MAP_MAL[status] || "planned", progress: episodes, score, malId });
    }
  });

  // Manga entries
  doc.querySelectorAll("manga").forEach((node) => {
    const title = node.querySelector("manga_title")?.textContent || node.querySelector("series_title")?.textContent;
    const status = node.querySelector("my_status")?.textContent;
    const chapters = parseInt(node.querySelector("my_read_chapters")?.textContent || "0");
    const score = parseInt(node.querySelector("my_score")?.textContent || "0");
    const malId = node.querySelector("manga_mangadb_id")?.textContent;
    if (title) {
      entries.push({ title, type: "manga", status: STATUS_MAP_MAL[status] || "planned", progress: chapters, score, malId });
    }
  });

  return entries;
}

// Fetch AniList user list
async function fetchAniList(username) {
  const query = `
    query($username: String, $type: MediaType) {
      MediaListCollection(userName: $username, type: $type) {
        lists {
          entries {
            media { title { romaji english } episodes chapters format }
            status progress score
          }
        }
      }
    }
  `;

  const entries = [];
  for (const type of ["ANIME", "MANGA"]) {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { username, type } }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0]?.message || "Erro na AniList API");

    const lists = json.data?.MediaListCollection?.lists || [];
    for (const list of lists) {
      for (const entry of list.entries || []) {
        const title = entry.media?.title?.english || entry.media?.title?.romaji;
        const mediaType = type === "ANIME" ? "anime" : "manga";
        const statusMap = {
          CURRENT: mediaType === "anime" ? "watching" : "reading",
          COMPLETED: "completed",
          PLANNING: "planned",
          DROPPED: "dropped",
          PAUSED: "on_hold",
          REPEATING: mediaType === "anime" ? "watching" : "reading",
        };
        if (title) {
          entries.push({
            title,
            type: mediaType,
            status: statusMap[entry.status] || "planned",
            progress: entry.progress || 0,
            score: entry.score || 0,
          });
        }
      }
    }
  }
  return entries;
}

// Build preview from raw entries
function buildPreview(rawEntries, existingEntries) {
  const found = [];
  const notFound = [];

  for (const e of rawEntries) {
    const work = findCatalogWork(e.title);
    if (work) {
      const existingEntry = existingEntries.find((ex) => ex.title === work.title);
      found.push({ ...e, work, existingEntry });
    } else {
      notFound.push(e);
    }
  }

  const statusCounts = {};
  for (const e of found) {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  }

  return { found, notFound, statusCounts };
}

export default function ImportList({ existingEntries = [], onImportDone }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("choose"); // choose | preview | done
  const [source, setSource] = useState("mal"); // mal | anilist
  const [anilistUsername, setAnilistUsername] = useState("");
  const [preview, setPreview] = useState(null);
  const [rawEntries, setRawEntries] = useState([]);
  const [mode, setMode] = useState("all"); // all | new_only | merge
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  function reset() {
    setStep("choose");
    setPreview(null);
    setRawEntries([]);
    setError(null);
    setResult(null);
    setMode("all");
    setAnilistUsername("");
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const text = await file.text();
      const entries = parseMALXML(text);
      if (entries.length === 0) throw new Error("Nenhuma obra encontrada no arquivo XML.");
      setRawEntries(entries);
      setPreview(buildPreview(entries, existingEntries));
      setStep("preview");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAniListFetch() {
    if (!anilistUsername.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const entries = await fetchAniList(anilistUsername.trim());
      if (entries.length === 0) throw new Error("Nenhuma obra encontrada nesta conta AniList.");
      setRawEntries(entries);
      setPreview(buildPreview(entries, existingEntries));
      setStep("preview");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!preview) return;
    setLoading(true);
    let imported = 0;
    let skipped = 0;
    let alreadyExisted = 0;

    for (const item of preview.found) {
      const existing = item.existingEntry;
      const workTitle = item.work.title;
      const type = item.type === "manga" ? "manga" : "anime";

      if (mode === "new_only" && existing) {
        alreadyExisted++;
        continue;
      }

      if (mode === "merge" && existing) {
        // Keep max progress
        const currentProgress = type === "manga" ? (existing.current_chapter || 0) : (existing.current_episode || 0);
        const newProgress = item.progress || 0;
        if (newProgress > currentProgress) {
          const updates = type === "manga"
            ? { current_chapter: newProgress, status: item.status }
            : { current_episode: newProgress, status: item.status };
          await base44.entities.AnimeEntry.update(existing.id, updates);
          imported++;
        } else {
          alreadyExisted++;
        }
        continue;
      }

      if (mode === "all" && existing) {
        const updates = type === "manga"
          ? { status: item.status, current_chapter: item.progress || 0, rating: item.score || 0 }
          : { status: item.status, current_episode: item.progress || 0, rating: item.score || 0 };
        await base44.entities.AnimeEntry.update(existing.id, updates);
        imported++;
        continue;
      }

      // Create new
      const data = {
        title: workTitle,
        type,
        status: item.status,
        current_episode: type === "anime" ? (item.progress || 0) : 0,
        current_chapter: type === "manga" ? (item.progress || 0) : 0,
        total_episodes: type === "anime" ? (item.work.totalEpisodes || 0) : 0,
        total_chapters: type === "manga" ? (item.work.totalChapters || 0) : 0,
        rating: item.score || 0,
      };
      await base44.entities.AnimeEntry.create(data);
      imported++;
    }

    skipped = preview.notFound.length;
    setResult({ imported, skipped, alreadyExisted });
    setStep("done");
    setLoading(false);
    onImportDone?.();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-border text-muted-foreground hover:text-foreground"
        onClick={() => { reset(); setOpen(true); }}
      >
        <Download className="w-4 h-4" />
        Importar lista
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-space">Importar lista</DialogTitle>
          </DialogHeader>

          {step === "choose" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={source === "mal" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSource("mal")}
                  className={source === "mal" ? "bg-primary text-primary-foreground" : "border-border"}
                >
                  MyAnimeList (XML)
                </Button>
                <Button
                  variant={source === "anilist" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSource("anilist")}
                  className={source === "anilist" ? "bg-primary text-primary-foreground" : "border-border"}
                >
                  AniList
                </Button>
              </div>

              {source === "mal" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    No MAL, vá em <strong>Perfil → Exportar lista</strong> e faça o download do XML. Depois faça o upload aqui.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-dashed border-border hover:border-primary/50"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Carregar arquivo .xml
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              )}

              {source === "anilist" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Digite seu username do AniList para buscar sua lista.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Username AniList"
                      value={anilistUsername}
                      onChange={(e) => setAnilistUsername(e.target.value)}
                      className="bg-secondary border-none"
                      onKeyDown={(e) => e.key === "Enter" && handleAniListFetch()}
                    />
                    <Button
                      onClick={handleAniListFetch}
                      disabled={loading || !anilistUsername.trim()}
                      className="bg-primary text-primary-foreground"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {error}
                </p>
              )}
            </div>
          )}

          {step === "preview" && preview && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-secondary/40 rounded-lg p-2">
                  <p className="font-bold text-primary text-lg">{preview.found.length}</p>
                  <p className="text-[10px] text-muted-foreground">No catálogo</p>
                </div>
                <div className="bg-secondary/40 rounded-lg p-2">
                  <p className="font-bold text-muted-foreground text-lg">{preview.notFound.length}</p>
                  <p className="text-[10px] text-muted-foreground">Não encontradas</p>
                </div>
                <div className="bg-secondary/40 rounded-lg p-2">
                  <p className="font-bold text-chart-4 text-lg">{rawEntries.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total importadas</p>
                </div>
              </div>

              {/* Status breakdown */}
              <div className="flex flex-wrap gap-1">
                {Object.entries(preview.statusCounts).map(([s, c]) => (
                  <Badge key={s} variant="outline" className="text-[10px] border-border text-muted-foreground">
                    {STATUS_LABEL[s] || s}: {c}
                  </Badge>
                ))}
              </div>

              {/* Import mode */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Modo de importação:</p>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="bg-secondary border-none text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Importar tudo (substituir existentes)</SelectItem>
                    <SelectItem value="new_only">Apenas novas (não sobrescrever)</SelectItem>
                    <SelectItem value="merge">Mesclar (manter maior progresso)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={reset} className="gap-1 text-muted-foreground">
                  <X className="w-3.5 h-3.5" /> Voltar
                </Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={loading || preview.found.length === 0}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar importação"}
                </Button>
              </div>
            </div>
          )}

          {step === "done" && result && (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
              <p className="font-space font-bold text-foreground">Importação concluída!</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-secondary/40 rounded-lg p-2">
                  <p className="font-bold text-primary text-lg">{result.imported}</p>
                  <p className="text-[10px] text-muted-foreground">Importadas</p>
                </div>
                <div className="bg-secondary/40 rounded-lg p-2">
                  <p className="font-bold text-muted-foreground text-lg">{result.alreadyExisted}</p>
                  <p className="text-[10px] text-muted-foreground">Mantidas</p>
                </div>
                <div className="bg-secondary/40 rounded-lg p-2">
                  <p className="font-bold text-chart-4 text-lg">{result.skipped}</p>
                  <p className="text-[10px] text-muted-foreground">Ignoradas</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{result.skipped} obras não foram encontradas no catálogo ZOKU e foram ignoradas.</p>
              <Button onClick={() => { setOpen(false); reset(); }} className="w-full bg-primary text-primary-foreground">Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}