import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Fallback: logos hardcoded atuais — garantem que o site nunca fica sem logo
const FALLBACK_LOGO_ICON = "https://media.base44.com/images/public/69f36ad625ae768ae51fc819/deb2fc23d_LOGOAZ.png";
const FALLBACK_LOGO_HORIZONTAL = "https://media.base44.com/images/public/69f36ad625ae768ae51fc819/c61581414_aniZoku.png";

export function useSiteConfig() {
  const { data: config } = useQuery({
    queryKey: ["site-config"],
    queryFn: async () => {
      const list = await base44.entities.SiteConfig.list("-updated_date", 1);
      return list?.[0] || null;
    },
    staleTime: 30000,
  });

  const logo_compact_url = config?.logo_compact_url || FALLBACK_LOGO_ICON;
  const logo_full_url = config?.logo_full_url || FALLBACK_LOGO_HORIZONTAL;
  const achievement_sound_url = config?.achievement_sound_url || "";

  return { config, logo_compact_url, logo_full_url, achievement_sound_url };
}