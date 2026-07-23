import PlatformBannersSection from "@/components/admin/homepromo/PlatformBannersSection";
import FeaturedNewsSection from "@/components/admin/homepromo/FeaturedNewsSection";
import HeroWorksSection from "@/components/admin/homepromo/HeroWorksSection";

/**
 * Painel unificado de promocionais da home.
 * Reúne em um só lugar tudo que aparece como destaque na home:
 *  - Faixa de banners (PlatformBanner)
 *  - Notícias em destaque (carrossel principal + faixa "Notícia quente")
 *  - Obras em destaque do carrossel principal (is_trending)
 */
export default function BannersPanel() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-space font-bold text-xl text-foreground">Promocionais da Home</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie tudo que aparece como destaque na home: faixa de banners, carrossel principal e notícia em destaque.
        </p>
      </div>
      <PlatformBannersSection />
      <FeaturedNewsSection />
      <HeroWorksSection />
    </div>
  );
}