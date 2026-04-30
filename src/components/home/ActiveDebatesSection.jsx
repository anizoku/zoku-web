import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Flame, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const fallbackDebates = [
  { id: "1", title: "Quem é o vilão mais forte de todos os animes?", replies_count: 142, is_hot: true, tags: ["Discussão"] },
  { id: "2", title: "Solo Leveling S2 superou as expectativas?", replies_count: 89, is_hot: true, tags: ["Solo Leveling"] },
  { id: "3", title: "Top 5 plot twists em mangás", replies_count: 67, is_hot: false, tags: ["Mangá"] },
  { id: "4", title: "Teoria: o verdadeiro poder de Gojo", replies_count: 203, is_hot: true, tags: ["JJK", "Teoria"] },
];

export default function ActiveDebatesSection() {
  const { data: debates } = useQuery({
    queryKey: ["debates"],
    queryFn: () => base44.entities.Debate.list("-created_date", 5),
    initialData: [],
  });

  const displayDebates = debates.length > 0 ? debates : fallbackDebates;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-space font-semibold text-sm">Debates Ativos</h3>
        </div>
        <Link to="/communities" className="text-xs text-primary hover:underline flex items-center gap-1">
          Ver todos <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2.5">
        {displayDebates.map((debate) => (
          <div
            key={debate.id}
            className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors cursor-pointer border border-transparent hover:border-border"
          >
            <div className="flex items-start gap-2 mb-2">
              {debate.is_hot && <Flame className="w-3.5 h-3.5 text-chart-5 shrink-0 mt-0.5" />}
              <p className="text-sm font-medium text-foreground leading-snug">{debate.title}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {(debate.tags || []).slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-border">
                    {tag}
                  </Badge>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {debate.replies_count || 0}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}