import { Play } from "lucide-react";

const recentEpisodes = [
  { title: "Solo Leveling", episode: "EP 12", time: "Há 2h", cover: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&h=120&fit=crop" },
  { title: "Jujutsu Kaisen", episode: "EP 23", time: "Há 5h", cover: "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=200&h=120&fit=crop" },
  { title: "Demon Slayer", episode: "EP 8", time: "Há 12h", cover: "https://images.unsplash.com/photo-1607604276583-c1a320c02fc9?w=200&h=120&fit=crop" },
  { title: "My Hero Academia", episode: "EP 15", time: "Há 1d", cover: "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=200&h=120&fit=crop" },
];

export default function RecentEpisodesSection() {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <Play className="w-5 h-5 text-primary" />
        <h3 className="font-space font-semibold text-sm">Episódios Recentes</h3>
      </div>
      <div className="space-y-2.5">
        {recentEpisodes.map((ep, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
          >
            <div className="w-16 h-10 rounded-md bg-secondary overflow-hidden shrink-0 relative">
              <img src={ep.cover} alt={ep.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{ep.title}</p>
              <p className="text-xs text-muted-foreground">{ep.episode}</p>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{ep.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}