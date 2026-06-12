// ============================================================
// ACHIEVEMENTS DEFINITION — Full list (70 conquistas)
// ============================================================

export const ACHIEVEMENT_CATEGORIES = {
  episodes:    { label: "Progresso — Episódios",      color: "text-primary",      bg: "bg-primary/10"     },
  chapters:    { label: "Progresso — Capítulos",       color: "text-chart-2",      bg: "bg-chart-2/10"    },
  movies:      { label: "Progresso — Filmes",          color: "text-chart-5",      bg: "bg-chart-5/10"    },
  library:     { label: "Biblioteca Pessoal",           color: "text-chart-4",      bg: "bg-chart-4/10"    },
  consistency: { label: "Consistência",                 color: "text-amber-400",    bg: "bg-amber-400/10"  },
  social:      { label: "Social",                       color: "text-chart-3",      bg: "bg-chart-3/10"    },
  community:   { label: "Comunidade",                   color: "text-indigo-400",   bg: "bg-indigo-400/10" },
  collector:   { label: "Colecionador",                 color: "text-rose-400",     bg: "bg-rose-400/10"   },
  profile:     { label: "Perfil",                       color: "text-sky-400",      bg: "bg-sky-400/10"    },
  special:     { label: "Especiais",                    color: "text-yellow-400",   bg: "bg-yellow-400/10" },
};

export const ACHIEVEMENTS = [
  // ── EPISÓDIOS (6) ─────────────────────────────────────────
  { id: "first_episode",     category: "episodes",    icon: "Play",            label: "Primeiro Play",             desc: "Assista seu primeiro episódio",              xp: 50,   condition: (s) => s.totalEpisodes >= 1        },
  { id: "ep_10",             category: "episodes",    icon: "Tv",              label: "Maratonista Iniciante",     desc: "Assista 10 episódios",                       xp: 80,   condition: (s) => s.totalEpisodes >= 10       },
  { id: "ep_50",             category: "episodes",    icon: "Clapperboard",    label: "Viciado em Série",          desc: "Assista 50 episódios",                       xp: 150,  condition: (s) => s.totalEpisodes >= 50       },
  { id: "ep_100",            category: "episodes",    icon: "Flame",           label: "Sem Parar",                 desc: "Assista 100 episódios",                      xp: 250,  condition: (s) => s.totalEpisodes >= 100      },
  { id: "ep_500",            category: "episodes",    icon: "Zap",             label: "Lenda da Maratona",         desc: "Assista 500 episódios",                      xp: 500,  condition: (s) => s.totalEpisodes >= 500      },
  { id: "ep_1000",           category: "episodes",    icon: "Crown",           label: "Mestre dos Animes",         desc: "Assista 1000 episódios",                     xp: 1000, condition: (s) => s.totalEpisodes >= 1000     },

  // ── CAPÍTULOS (5) ─────────────────────────────────────────
  { id: "first_chapter",     category: "chapters",    icon: "BookOpen",        label: "Primeiro Capítulo",         desc: "Leia seu primeiro capítulo de mangá",        xp: 40,   condition: (s) => s.totalChapters >= 1        },
  { id: "ch_20",             category: "chapters",    icon: "Book",            label: "Leitor Casual",             desc: "Leia 20 capítulos",                          xp: 80,   condition: (s) => s.totalChapters >= 20       },
  { id: "ch_100",            category: "chapters",    icon: "BookMarked",      label: "Devorador de Páginas",      desc: "Leia 100 capítulos",                         xp: 200,  condition: (s) => s.totalChapters >= 100      },
  { id: "ch_500",            category: "chapters",    icon: "Library",         label: "Mestre do Mangá",           desc: "Leia 500 capítulos",                         xp: 450,  condition: (s) => s.totalChapters >= 500      },
  { id: "ch_1000",           category: "chapters",    icon: "Scroll",          label: "Lenda dos Mangás",          desc: "Leia 1000 capítulos",                        xp: 900,  condition: (s) => s.totalChapters >= 1000     },

  // ── FILMES (4) ────────────────────────────────────────────
  { id: "first_movie",       category: "movies",      icon: "Film",            label: "Sessão de Cinema",          desc: "Assista ao primeiro filme",                  xp: 60,   condition: (s) => s.totalMovies >= 1          },
  { id: "movie_10",          category: "movies",      icon: "Popcorn",         label: "Cinéfilo Otaku",            desc: "Assista 10 filmes",                          xp: 120,  condition: (s) => s.totalMovies >= 10         },
  { id: "movie_25",          category: "movies",      icon: "Tickets",         label: "Festival de Filmes",        desc: "Assista 25 filmes",                          xp: 250,  condition: (s) => s.totalMovies >= 25         },
  { id: "movie_50",          category: "movies",      icon: "Video",           label: "Diretor da Própria Lista",  desc: "Assista 50 filmes",                          xp: 500,  condition: (s) => s.totalMovies >= 50         },

  // ── BIBLIOTECA PESSOAL (12) ───────────────────────────────
  { id: "first_add",         category: "library",     icon: "PlusCircle",      label: "Primeira Obra",             desc: "Adicione a primeira obra à lista",           xp: 20,   condition: (s) => s.totalTitles >= 1          },
  { id: "list_5",            category: "library",     icon: "LayoutList",      label: "Começando a Colecionar",    desc: "Tenha 5 obras na lista",                     xp: 40,   condition: (s) => s.totalTitles >= 5          },
  { id: "list_10",           category: "library",     icon: "FolderOpen",      label: "Coleção Inicial",           desc: "Tenha 10 obras na lista",                    xp: 80,   condition: (s) => s.totalTitles >= 10         },
  { id: "list_25",           category: "library",     icon: "Database",        label: "Acervo Crescente",          desc: "Tenha 25 obras na lista",                    xp: 150,  condition: (s) => s.totalTitles >= 25         },
  { id: "list_50",           category: "library",     icon: "Archive",         label: "Biblioteca Viva",           desc: "Tenha 50 títulos na lista",                  xp: 300,  condition: (s) => s.totalTitles >= 50         },
  { id: "list_100",          category: "library",     icon: "Layers",          label: "Lista de Respeito",         desc: "Tenha 100 títulos na lista",                 xp: 500,  condition: (s) => s.totalTitles >= 100        },
  { id: "first_complete",    category: "library",     icon: "CheckCircle",     label: "Missão Cumprida",           desc: "Conclua sua primeira obra",                  xp: 100,  condition: (s) => s.completedTitles >= 1      },
  { id: "complete_5",        category: "library",     icon: "ListChecks",      label: "Finalizador",               desc: "Conclua 5 obras",                            xp: 200,  condition: (s) => s.completedTitles >= 5      },
  { id: "complete_10",       category: "library",     icon: "Medal",           label: "Colecionador",              desc: "Conclua 10 obras",                           xp: 300,  condition: (s) => s.completedTitles >= 10     },
  { id: "complete_25",       category: "library",     icon: "Award",           label: "Veterano",                  desc: "Conclua 25 obras",                           xp: 500,  condition: (s) => s.completedTitles >= 25     },
  { id: "four_categories",   category: "library",     icon: "Scale",           label: "Multimídia Total",          desc: "Tenha obras de 3 categorias diferentes na lista", xp: 120, condition: (s) => s.categoryCount >= 3   },
  { id: "planned_10",        category: "library",     icon: "CalendarPlus",    label: "Plano de Futuro",           desc: "Adicione 10 obras em Planejo",               xp: 80,   condition: (s) => s.plannedTitles >= 10       },

  // ── CONSISTÊNCIA (7) ─────────────────────────────────────
  { id: "streak_3",          category: "consistency", icon: "Flame",           label: "Todo Dia um Episódio",      desc: "Atualize progresso por 3 dias seguidos",     xp: 100,  condition: (s) => s.currentStreak >= 3        },
  { id: "streak_7",          category: "consistency", icon: "Swords",          label: "Sequência Otaku",           desc: "Atualize progresso por 7 dias seguidos",     xp: 250,  condition: (s) => s.currentStreak >= 7        },
  { id: "streak_30",         category: "consistency", icon: "CalendarRange",   label: "Mês Intenso",               desc: "Atualize progresso por 30 dias seguidos",    xp: 600,  condition: (s) => s.currentStreak >= 30       },
  { id: "login_3",           category: "consistency", icon: "CalendarCheck",   label: "Visitante Frequente",       desc: "Faça login por 3 dias consecutivos",         xp: 60,   condition: (s) => s.loginStreak >= 3          },
  { id: "login_7",           category: "consistency", icon: "Calendar",        label: "Hábito Diário",             desc: "Faça login por 7 dias consecutivos",         xp: 150,  condition: (s) => s.loginStreak >= 7          },
  { id: "login_30",          category: "consistency", icon: "Star",            label: "Dedicado ao Zoku",          desc: "Faça login por 30 dias consecutivos",        xp: 400,  condition: (s) => s.loginStreak >= 30         },
  { id: "streak_weeks_4",    category: "consistency", icon: "Repeat",          label: "Ritual Semanal",            desc: "Adicione obras novas em 4 semanas diferentes", xp: 300, condition: (s) => s.activeWeeks >= 4         },

  // ── SOCIAL (14) ──────────────────────────────────────────
  { id: "first_friend",      category: "social",      icon: "UserCheck",       label: "Primeiro Amigo",            desc: "Adicione o primeiro amigo",                  xp: 50,   condition: (s) => s.friendsCount >= 1         },
  { id: "friends_5",         category: "social",      icon: "Users",           label: "Grupo de Nakamas",          desc: "Tenha 5 amigos",                             xp: 100,  condition: (s) => s.friendsCount >= 5         },
  { id: "friends_10",        category: "social",      icon: "Users2",          label: "Círculo Otaku",             desc: "Tenha 10 amigos",                            xp: 200,  condition: (s) => s.friendsCount >= 10        },
  { id: "friends_25",        category: "social",      icon: "Network",         label: "Rede de Nakamas",           desc: "Tenha 25 amigos",                            xp: 400,  condition: (s) => s.friendsCount >= 25        },
  { id: "first_post",        category: "social",      icon: "MessageSquare",   label: "Voz da Comunidade",         desc: "Publique seu primeiro post",                 xp: 30,   condition: (s) => s.totalPosts >= 1           },
  { id: "post_liked_5",      category: "social",      icon: "HeartHandshake",  label: "Apoio da Galera",           desc: "Tenha um post com 5 curtidas",               xp: 80,   condition: (s) => s.maxLikesOnPost >= 5       },
  { id: "post_liked_10",     category: "social",      icon: "TrendingUp",      label: "Post Estourado",            desc: "Tenha um post com 10 curtidas",              xp: 150,  condition: (s) => s.maxLikesOnPost >= 10      },
  { id: "post_10",           category: "social",      icon: "MessageSquarePlus", label: "Influencer Otaku",        desc: "Publique 10 posts",                          xp: 120,  condition: (s) => s.totalPosts >= 10          },
  { id: "first_comment",     category: "social",      icon: "MessageCircle",   label: "Primeira Opinião",          desc: "Faça o primeiro comentário",                 xp: 25,   condition: (s) => s.totalComments >= 1        },
  { id: "comment_received",  category: "social",      icon: "MessagesSquare",  label: "Conteúdo Gerou Debate",     desc: "Receba o primeiro comentário em um post",    xp: 50,   condition: (s) => s.commentsReceived >= 1     },
  { id: "first_community",   category: "social",      icon: "Users",           label: "Primeira Comunidade",       desc: "Entre em uma comunidade",                    xp: 40,   condition: (s) => s.communitiesJoined >= 1    },
  { id: "watch_together_first", category: "social",   icon: "Tv2",             label: "Vamos Juntos!",             desc: "Use o Watch Together pela primeira vez",     xp: 60,   condition: (s) => s.watchTogetherCount >= 1   },
  { id: "watch_together_done", category: "social",    icon: "PartyPopper",     label: "Sessão Completa",           desc: "Conclua uma sessão de Watch Together",       xp: 100,  condition: (s) => s.watchTogetherCompleted >= 1 },
  { id: "friend_request_sent", category: "social",    icon: "UserPlus",        label: "Iniciativa Social",         desc: "Envie seu primeiro pedido de amizade",       xp: 20,   condition: (s) => s.friendRequestsSent >= 1   },

  // ── COMUNIDADE (6) ────────────────────────────────────────
  { id: "post_community_10", category: "community",   icon: "Megaphone",       label: "Voz da Comunidade",         desc: "Faça 10 posts em comunidades",               xp: 150,  condition: (s) => s.communityPosts >= 10      },
  { id: "founded_community", category: "community",   icon: "Building2",       label: "Fundador",                  desc: "Crie a primeira comunidade",                 xp: 100,  condition: (s) => s.communitiesCreated >= 1   },
  { id: "community_10m",     category: "community",   icon: "UsersRound",      label: "Líder de Comunidade",       desc: "Crie uma comunidade com 10 membros",         xp: 250,  condition: (s) => s.communityMaxMembers >= 10 },
  { id: "first_event",       category: "community",   icon: "Calendar",        label: "Evento Marcado",            desc: "Participe de um evento social",              xp: 60,   condition: (s) => s.eventsJoined >= 1         },
  { id: "create_event",      category: "community",   icon: "CalendarPlus2",   label: "Organizador",               desc: "Crie um evento social",                      xp: 80,   condition: (s) => s.eventsCreated >= 1        },
  { id: "communities_5",     category: "community",   icon: "Globe",           label: "Membro Ativo",              desc: "Entre em 5 comunidades",                     xp: 150,  condition: (s) => s.communitiesJoined >= 5    },

  // ── COLECIONADOR (7) ──────────────────────────────────────
  { id: "both_types",        category: "collector",   icon: "BookCopy",        label: "Equilibrista",              desc: "Tenha ao menos 1 anime e 1 mangá na lista",  xp: 60,   condition: (s) => s.hasAnime && s.hasManga    },
  { id: "multimedia",        category: "collector",   icon: "Layers",          label: "Multimídia",                desc: "Tenha anime, mangá e filme na lista",        xp: 120,  condition: (s) => s.hasAnime && s.hasManga && s.hasMovie },
  { id: "five_genres",       category: "collector",   icon: "Tags",            label: "Gênero Total",              desc: "Tenha obras de pelo menos 5 gêneros diferentes", xp: 200, condition: (s) => s.uniqueGenres >= 5       },
  { id: "movie_and_live",    category: "collector",   icon: "Clapperboard",    label: "Telão e Streaming",         desc: "Tenha pelo menos um filme e uma live-action", xp: 80,   condition: (s) => s.hasMovie && s.hasLiveaction },
  { id: "same_work_types",   category: "collector",   icon: "Shuffle",         label: "Anime e Mangá da Mesma Obra", desc: "Assista anime e leia mangá da mesma obra", xp: 150,  condition: (s) => s.sameWorkBothTypes >= 1    },
  { id: "long_anime",        category: "collector",   icon: "Trophy",          label: "Maratonista Total",         desc: "Conclua um anime com mais de 100 episódios", xp: 300,  condition: (s) => s.completedLongAnime >= 1   },
  { id: "long_manga",        category: "collector",   icon: "ScrollText",      label: "Mangaka por Mérito",        desc: "Conclua um mangá com mais de 100 capítulos", xp: 300,  condition: (s) => s.completedLongManga >= 1   },

  // ── PERFIL (8) ────────────────────────────────────────────
  { id: "profile_complete",  category: "profile",     icon: "UserCircle",      label: "Perfil Completo",           desc: "Preencha nome, username, avatar e bio",      xp: 80,   condition: (s) => s.profileComplete           },
  { id: "has_avatar",        category: "profile",     icon: "ImageIcon",       label: "Identidade Visual",         desc: "Adicione um avatar personalizado",           xp: 40,   condition: (s) => s.hasAvatar                 },
  { id: "has_banner",        category: "profile",     icon: "PanelTop",        label: "Perfil com Estilo",         desc: "Adicione um banner personalizado",           xp: 40,   condition: (s) => s.hasBanner                 },
  { id: "has_badge",         category: "profile",     icon: "BadgeCheck",      label: "Exibindo Conquista",        desc: "Selecione um badge de conquista no avatar",  xp: 30,   condition: (s) => s.hasSelectedBadge          },
  { id: "level_5",           category: "profile",     icon: "Zap",             label: "Subindo de Nível",          desc: "Atinja o nível 5",                           xp: 100,  condition: (s) => s.currentLevel >= 5         },
  { id: "level_10",          category: "profile",     icon: "TrendingUp",      label: "Explorador",                desc: "Atinja o nível 10",                          xp: 200,  condition: (s) => s.currentLevel >= 10        },
  { id: "level_25",          category: "profile",     icon: "Flame",           label: "Veterano Experiente",       desc: "Atinja o nível 25",                          xp: 500,  condition: (s) => s.currentLevel >= 25        },
  { id: "level_50",          category: "profile",     icon: "Crown",           label: "Elite do Zoku",             desc: "Atinja o nível 50",                          xp: 1000, condition: (s) => s.currentLevel >= 50        },

  // ── ESPECIAIS (5) ─────────────────────────────────────────
  { id: "founder",           category: "special",     icon: "Shield",          label: "Fundador do ZOKU",          desc: "Um dos 10 primeiros usuários do ZOKU",       xp: 500,  condition: (s) => s.isFounder === true        },
  { id: "same_day_complete", category: "special",     icon: "Rocket",          label: "Maratona Relâmpago",        desc: "Conclua uma obra no mesmo dia em que a adicionou", xp: 200, condition: (s) => s.sameDayComplete >= 1  },
  { id: "complete_100",      category: "special",     icon: "ShieldStar",      label: "Cem por Cento",             desc: "Tenha mais de 100 obras concluídas",         xp: 2000, condition: (s) => s.completedTitles >= 100    },
  { id: "max_level",         category: "special",     icon: "Crown",           label: "Transcendente",             desc: "Atinja o nível máximo do sistema (100)",     xp: 5000, condition: (s) => s.currentLevel >= 100       },
  { id: "otaku_supreme",     category: "special",     icon: "Sparkles",        label: "Otaku Supremo",             desc: "100 eps, 100 caps, 10 obras concluídas e 10 posts", xp: 2000, condition: (s) => s.totalEpisodes >= 100 && s.totalChapters >= 100 && s.completedTitles >= 10 && s.totalPosts >= 10 },
];

// ── Color by category ─────────────────────────────────────
export function getAchievementColor(id) {
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (!a) return "text-muted-foreground";
  return ACHIEVEMENT_CATEGORIES[a.category]?.color || "text-muted-foreground";
}