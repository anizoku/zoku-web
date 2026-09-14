import { Tv, BookOpen, Film, Trophy, Clock, Star, TrendingUp } from "lucide-react";

function StatCard({ icon: Icon, label, value, color = "text-primary" }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <Icon className={`w-4 h-4 ${color} mx-auto mb-1.5`} />
      <p className="font-space font-bold text-base text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

export default function PublicProfileStats({ entries }) {
  const animeEntries = entries.filter(e => e.type === "anime");
  const mangaEntries = entries.filter(e => e.type === "manga");
  const movieEntries = entries.filter(e => e.type === "movie");

  const totalEpisodes = animeEntries.reduce((s, e) => s + (e.current_episode || 0), 0);
  const totalChapters = mangaEntries.reduce((s, e) => s + (e.current_chapter || 0), 0);
  const totalMovies = movieEntries.filter(e => e.status === "completed").length;
  const totalCompleted = entries.filter(e => e.status === "completed").length;

  // Time: episodes * 24min
  const totalMinutes = totalEpisodes * 24;
  const totalDays = Math.floor(totalMinutes / (60 * 24));
  const totalHours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const timeStr = totalDays > 0 ? `${totalDays}d ${totalHours}h` : `${totalHours}h`;

  // Favorite genre (most common in completed entries)
  const genreCounts = {};
  entries.filter(e => e.status === "completed" && e.genre).forEach(e => {
    const genres = e.genre.split(",").map(g => g.trim()).filter(Boolean).filter(g => !g.startsWith("__"));
    genres.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
  });
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  // Favorite work (highest rating)
  const ratedEntries = entries.filter(e => e.rating > 0).sort((a, b) => b.rating - a.rating);
  const favWork = ratedEntries[0]?.title || "—";

  const stats = [
    { icon: Tv, label: "Eps. assistidos", value: totalEpisodes.toLocaleString(), color: "text-primary" },
    { icon: BookOpen, label: "Caps. lidos", value: totalChapters.toLocaleString(), color: "text-chart-2" },
    { icon: Film, label: "Filmes", value: totalMovies, color: "text-chart-5" },
    { icon: Trophy, label: "Concluídos", value: totalCompleted, color: "text-chart-4" },
    { icon: Clock, label: "Tempo total", value: timeStr, color: "text-chart-3" },
    { icon: Star, label: "Gênero fav.", value: topGenre, color: "text-chart-4" },
  ];

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" /> Estatísticas
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>
      {favWork !== "—" && (
        <p className="text-xs text-muted-foreground">
          ⭐ Obra favorita: <span className="text-foreground font-medium">{favWork}</span>
        </p>
      )}
    </div>
  );
}