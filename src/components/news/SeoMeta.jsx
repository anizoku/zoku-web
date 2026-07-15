import { useEffect } from "react";

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Componente reutilizável de SEO/metatags dinâmicas.
 * Manipula o <head> diretamente (sem dependências externas).
 */
export default function SeoMeta({
  title,
  description,
  image,
  url,
  type = "website",
  publishedTime,
}) {
  useEffect(() => {
    document.title = title ? `${title} — ZOKU` : "ZOKU";

    const canonical = url || window.location.href;

    if (description) upsertMeta("name", "description", description);

    upsertMeta("property", "og:title", title || "ZOKU");
    if (description) upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:url", canonical);
    if (image) upsertMeta("property", "og:image", image);

    upsertMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    if (image) upsertMeta("name", "twitter:image", image);
    upsertMeta("name", "twitter:title", title || "ZOKU");
    if (description) upsertMeta("name", "twitter:description", description);

    if (publishedTime) upsertMeta("property", "article:published_time", publishedTime);

    // canonical link
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonical);

    return () => {
      document.title = "ZOKU";
    };
  }, [title, description, image, url, type, publishedTime]);

  return null;
}