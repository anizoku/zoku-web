import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useCatalog } from "@/contexts/CatalogContext";

function getContextCategory(pathname) {
  if (pathname.startsWith("/animes")) return "anime";
  if (pathname.startsWith("/mangas")) return "manga";
  if (pathname.startsWith("/films")) return "movie";
  if (pathname.startsWith("/series")) return "liveaction";
  if (pathname.startsWith("/friends")) return "friends";
  if (pathname.startsWith("/events")) return "events";
  return null;
}

function normalizeQ(s) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function scoreWork(item, query, contextCategory) {
  const q = normalizeQ(query);
  const title = normalizeQ(item.title);
  const romaji = normalizeQ(item.romaji_title);
  let score = 0;

  if (title === q) score += 100;
  else if (title.startsWith(q)) score += 50;
  else if (title.includes(q)) score += 20;
  if (romaji && (romaji === q || romaji.startsWith(q) || romaji.includes(q))) score += 40;
  if (item.genres?.some(g => normalizeQ(g).includes(q))) score += 5;

  if (contextCategory && item.categories?.includes(contextCategory)) score += 30;

  score += (item.rating || 0) * 2;
  return score;
}

export function useGlobalSearch(query) {
  const location = useLocation();
  const context = getContextCategory(location.pathname);
  const { catalog } = useCatalog();

  const [results, setResults] = useState({ works: [], users: [], events: [], communities: [] });
  const [isLoading, setIsLoading] = useState(false);

  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setResults({ works: [], users: [], events: [], communities: [] });
      return;
    }
    setIsLoading(true);
    try {
      const lq = q.toLowerCase();

      // Works from unified catalog (static + sync + dynamic)
      const nq = normalizeQ(q);
      const matchedWorks = catalog
        .filter(item =>
          normalizeQ(item.title).includes(nq) ||
          normalizeQ(item.romaji_title).includes(nq) ||
          item.genres?.some(g => normalizeQ(g).includes(nq))
        )
        .map(item => ({ ...item, _score: scoreWork(item, q, context) }))
        .sort((a, b) => b._score - a._score)
        .slice(0, 8);

      // Users (async) — uses UserProfile which is publicly readable by all users
      let users = [];
      try {
        const allProfiles = await base44.entities.UserProfile.list("-created_date", 200);
        users = allProfiles
          .filter(p =>
            p.username?.toLowerCase().includes(lq) ||
            p.user_email?.toLowerCase().includes(lq) ||
            p.bio?.toLowerCase().includes(lq)
          )
          .slice(0, 4)
          .map(p => ({
            id: p.id,
            email: p.user_email,
            full_name: p.username || p.user_email,
            avatar_url: p.avatar_url,
          }));
      } catch {}

      // Communities (async)
      let communities = [];
      try {
        const allCommunities = await base44.entities.Community.list("-members_count", 100);
        communities = allCommunities
          .filter(c =>
            c.name?.toLowerCase().includes(lq) ||
            c.description?.toLowerCase().includes(lq) ||
            c.tags?.some(tag => tag.toLowerCase().includes(lq))
          )
          .slice(0, 3);
      } catch {}

      // Events (async)
      let events = [];
      try {
        const allEvents = await base44.entities.SocialEvent.list("-event_date", 50);
        events = allEvents
          .filter(e =>
            e.title?.toLowerCase().includes(lq) ||
            e.media_title?.toLowerCase().includes(lq)
          )
          .slice(0, 3);
      } catch {}

      setResults({ works: matchedWorks, users, events, communities });
    } finally {
      setIsLoading(false);
    }
  }, [context, catalog]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ works: [], users: [], events: [], communities: [] });
      return;
    }
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  // Contextual: first results from current section
  const contextWorks = context && context !== "friends" && context !== "events"
    ? results.works.filter(w => w.categories?.includes(context))
    : [];
  const otherWorks = results.works.filter(w => !contextWorks.includes(w));

  const total = results.works.length + results.users.length + results.events.length + results.communities.length;

  return {
    isLoading,
    contextWorks,
    otherWorks,
    users: results.users,
    events: results.events,
    communities: results.communities,
    hasResults: total > 0,
    isEmpty: !isLoading && query.length >= 2 && total === 0,
  };
}