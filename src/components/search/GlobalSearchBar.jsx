import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Tv, BookOpen, Film, Clapperboard, User, Calendar, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";

const categoryConfig = {
  anime: { label: "Anime", icon: Tv, color: "bg-chart-2/80 text-white border-none" },
  manga: { label: "Mangá", icon: BookOpen, color: "bg-chart-3/80 text-white border-none" },
  movie: { label: "Filme", icon: Film, color: "bg-chart-5/80 text-white border-none" },
  liveaction: { label: "Live-Action", icon: Clapperboard, color: "bg-chart-1/80 text-white border-none" },
};

function WorkResult({ item, onClick }) {
  const cats = item.categories || [];
  const cat = cats[0];
  const cfg = categoryConfig[cat] || categoryConfig.anime;
  const Icon = cfg.icon;
  return (
    <button
      onClick={() => onClick(item)}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/70 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
        <p className="text-[10px] text-muted-foreground truncate">{item.genres?.slice(0,2).join(" · ")}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge className={`${cfg.color} text-[9px] px-1.5 py-0`}>{cfg.label}</Badge>
        {item.rating > 0 && <span className="text-[10px] text-chart-4">★ {item.rating}</span>}
      </div>
    </button>
  );
}

function UserResult({ user, onClick }) {
  return (
    <button
      onClick={() => onClick(user)}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/70 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <User className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{user.full_name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
      </div>
      <Badge className="bg-secondary text-muted-foreground border-none text-[9px] px-1.5 py-0">Usuário</Badge>
    </button>
  );
}

function EventResult({ event, onClick }) {
  return (
    <button
      onClick={() => onClick(event)}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/70 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded bg-chart-5/10 flex items-center justify-center shrink-0">
        <Calendar className="w-4 h-4 text-chart-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
        {event.media_title && <p className="text-[10px] text-muted-foreground truncate">{event.media_title}</p>}
      </div>
      <Badge className="bg-chart-5/20 text-chart-5 border-none text-[9px] px-1.5 py-0">Evento</Badge>
    </button>
  );
}

function CommunityResult({ community, onClick }) {
  return (
    <button
      onClick={() => onClick(community)}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/70 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center shrink-0">
        <Users className="w-4 h-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{community.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{community.members_count} membros</p>
      </div>
      <Badge className="bg-accent/20 text-accent border-none text-[9px] px-1.5 py-0">Comunidade</Badge>
    </button>
  );
}

function SectionHeader({ label }) {
  return (
    <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-background/50">
      {label}
    </p>
  );
}

export default function GlobalSearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const { isLoading, contextWorks, otherWorks, users, events, communities, hasResults, isEmpty } = useGlobalSearch(query);

  useEffect(() => {
    setOpen(query.length >= 2);
  }, [query, hasResults, isLoading]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
    if (e.key === "Enter") {
      // Navigate to first result
      if (contextWorks[0]) navigateToWork(contextWorks[0]);
      else if (otherWorks[0]) navigateToWork(otherWorks[0]);
      else if (users[0]) navigateToUser(users[0]);
      else if (communities[0]) navigateToCommunity(communities[0]);
      else if (events[0]) navigateToEvent(events[0]);
    }
  }

  function navigateToWork(item) {
    const tipo = item.categories?.[0] || "anime";
    navigate(`/obra/${item.slug}?tipo=${tipo}`);
    setQuery("");
    setOpen(false);
  }

  function navigateToUser(user) {
    navigate(`/u/${user.email}`);
    setQuery("");
    setOpen(false);
  }

  function navigateToCommunity(community) {
    navigate(`/communities/${community.id}`);
    setQuery("");
    setOpen(false);
  }

  function navigateToEvent(event) {
    navigate(`/events?eventId=${event.id}`);
    setQuery("");
    setOpen(false);
  }

  const showDropdown = open && query.length >= 2;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin z-10" />
      )}
      <Input
        ref={inputRef}
        placeholder="Buscar tudo: obras, usuários, comunidades, eventos..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onKeyDown={handleKeyDown}
        className="pl-9 pr-9 bg-secondary border-none h-9 text-sm placeholder:text-muted-foreground/60"
      />

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 max-h-[420px] overflow-y-auto">
          {isEmpty && (
            <p className="text-muted-foreground text-sm text-center py-8">
              Nenhum resultado para "{query}"
            </p>
          )}

          {contextWorks.length > 0 && (
            <>
              <SectionHeader label="Nesta seção" />
              {contextWorks.slice(0, 3).map(item => (
                <WorkResult key={item.slug} item={item} onClick={navigateToWork} />
              ))}
            </>
          )}

          {otherWorks.length > 0 && (
            <>
              <SectionHeader label={contextWorks.length > 0 ? "Outros resultados" : "Obras"} />
              {otherWorks.slice(0, 5).map(item => (
                <WorkResult key={item.slug} item={item} onClick={navigateToWork} />
              ))}
            </>
          )}

          {users.length > 0 && (
            <>
              <SectionHeader label="Usuários" />
              {users.map(u => (
                <UserResult key={u.id} user={u} onClick={navigateToUser} />
              ))}
            </>
          )}

          {communities.length > 0 && (
            <>
              <SectionHeader label="Comunidades" />
              {communities.map(c => (
                <CommunityResult key={c.id} community={c} onClick={navigateToCommunity} />
              ))}
            </>
          )}

          {events.length > 0 && (
            <>
              <SectionHeader label="Eventos" />
              {events.map(e => (
                <EventResult key={e.id} event={e} onClick={navigateToEvent} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}