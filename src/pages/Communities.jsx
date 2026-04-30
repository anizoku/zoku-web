import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Users, MessageSquare, Flame, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fallbackCommunities = [
  { id: "1", name: "Shonen Lovers", description: "Discussões sobre os melhores shonens de todos os tempos", members_count: 12400, category: "anime" },
  { id: "2", name: "Manga Readers", description: "Para quem prefere ler antes de assistir", members_count: 8700, category: "manga" },
  { id: "3", name: "Teoria Central", description: "Teorias e especulações sobre as séries mais populares", members_count: 5300, category: "theories" },
  { id: "4", name: "Anime News", description: "Fique por dentro das últimas novidades do mundo anime", members_count: 21000, category: "news" },
  { id: "5", name: "Reviews & Críticas", description: "Compartilhe suas análises detalhadas", members_count: 3200, category: "reviews" },
  { id: "6", name: "Otaku Geral", description: "Tudo sobre cultura otaku, cosplay, eventos e mais", members_count: 15600, category: "general" },
];

const categoryColors = {
  anime: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  manga: "bg-chart-3/15 text-chart-3 border-chart-3/20",
  theories: "bg-chart-4/15 text-chart-4 border-chart-4/20",
  news: "bg-primary/15 text-primary border-primary/20",
  reviews: "bg-chart-5/15 text-chart-5 border-chart-5/20",
  general: "bg-secondary text-secondary-foreground border-border",
};

const categoryLabels = {
  anime: "Anime",
  manga: "Mangá",
  theories: "Teorias",
  news: "Notícias",
  reviews: "Reviews",
  general: "Geral",
};

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n;
}

export default function Communities() {
  const { data: communities } = useQuery({
    queryKey: ["communities"],
    queryFn: () => base44.entities.Community.list("-members_count", 20),
    initialData: [],
  });

  const displayCommunities = communities.length > 0 ? communities : fallbackCommunities;

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-space font-bold text-2xl text-foreground">Comunidades</h1>
            <p className="text-sm text-muted-foreground">Participe de debates e discussões</p>
          </div>
        </div>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Criar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayCommunities.map((community) => (
          <div
            key={community.id}
            className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="font-space font-bold text-lg text-primary">
                  {community.name[0]}
                </span>
              </div>
              <Badge variant="outline" className={`text-[10px] ${categoryColors[community.category] || ""}`}>
                {categoryLabels[community.category] || community.category}
              </Badge>
            </div>
            <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
              {community.name}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              {community.description}
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" /> {formatNumber(community.members_count)} membros
              </span>
              <Button variant="outline" size="sm" className="h-7 text-xs border-primary/20 text-primary hover:bg-primary/10">
                Entrar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}