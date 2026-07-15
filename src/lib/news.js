export const categoryLabels = {
  anime: "Anime",
  manga: "Mangá",
  movie: "Filme",
  liveaction: "Live Action",
  general: "Geral",
};

export const newsCategories = [
  { key: "all", label: "Todas" },
  { key: "anime", label: "Anime" },
  { key: "manga", label: "Mangá" },
  { key: "movie", label: "Filme" },
  { key: "liveaction", label: "Live Action" },
  { key: "general", label: "Geral" },
];

// Categorias válidas para criação (sem "Todas")
export const newsCategoryOptions = [
  { key: "anime", label: "Anime" },
  { key: "manga", label: "Mangá" },
  { key: "movie", label: "Filme" },
  { key: "liveaction", label: "Live Action" },
  { key: "general", label: "Geral" },
];

// Imagem preferida para cada contexto, com fallback em image_url (legado)
export function getCardImage(n) {
  return n?.card_image_url || n?.image_url || "";
}
export function getBannerImage(n) {
  return n?.banner_image_url || n?.image_url || "";
}
export function getArticleImage(n) {
  return n?.article_image_url || n?.image_url || "";
}

export function slugify(text) {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function computeReadingMinutes(content) {
  const words = (content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatDatePT(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `há ${day}d`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `há ${wk}sem`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `há ${mo}mês`;
  const yr = Math.floor(day / 365);
  return `há ${yr}ano`;
}

/**
 * Detecta plataforma (youtube/vimeo) e extrai o ID de uma URL de vídeo.
 * Formatos aceitos:
 *  - youtube.com/watch?v=ID
 *  - youtu.be/ID
 *  - youtube.com/shorts/ID  (vertical)
 *  - youtube.com/embed/ID
 *  - vimeo.com/ID , vimeo.com/video/ID
 * Retorna { platform, id, embedUrl, orientation, aspectRatio } ou null se inválida.
 * Heurística de orientação: shorts = vertical/9:16; todo o resto = horizontal/16:9.
 */
export function getVideoEmbed(url) {
  if (!url || typeof url !== "string") return null;
  const u = url.trim();

  // YouTube
  let ytId = null;
  let isShorts = false;
  const ytWatch = u.match(/youtube\.com\/watch\?v=([\w-]{6,})/);
  const ytBe = u.match(/youtu\.be\/([\w-]{6,})/);
  const ytShorts = u.match(/youtube\.com\/shorts\/([\w-]{6,})/);
  const ytEmbed = u.match(/youtube\.com\/embed\/([\w-]{6,})/);
  if (ytWatch) ytId = ytWatch[1];
  else if (ytBe) ytId = ytBe[1];
  else if (ytShorts) { ytId = ytShorts[1]; isShorts = true; }
  else if (ytEmbed) ytId = ytEmbed[1];

  if (ytId) {
    return {
      platform: "youtube",
      id: ytId,
      embedUrl: `https://www.youtube.com/embed/${ytId}`,
      orientation: isShorts ? "vertical" : "horizontal",
      aspectRatio: isShorts ? "9/16" : "16/9",
    };
  }

  // Vimeo
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d{5,})/);
  if (vimeo) {
    return {
      platform: "vimeo",
      id: vimeo[1],
      embedUrl: `https://player.vimeo.com/video/${vimeo[1]}`,
      orientation: "horizontal",
      aspectRatio: "16/9",
    };
  }

  return null;
}

/**
 * Retorna true se a notícia possui vídeo (embed ou arquivo).
 * Compatível com registros legados (sem video_type): usa video_url + getVideoEmbed.
 */
export function hasNewsVideo(n) {
  if (!n) return false;
  const t = n.video_type;
  if (t === "file") return !!n.video_url;
  if (t === "embed") return !!getVideoEmbed(n.video_url);
  // legado: sem video_type mas com video_url de embed válido
  return !!getVideoEmbed(n.video_url);
}