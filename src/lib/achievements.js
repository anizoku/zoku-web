// ============================================================
// ACHIEVEMENTS DEFINITION — Full list with Lucide icon names
// ============================================================
// icon: name of a valid lucide-react icon

export const ACHIEVEMENTS = [
  // ── Episódios ────────────────────────────────────────────
  { id: "first_episode",     icon: "Play",            label: "Primeiro Play",          desc: "Assista seu primeiro episódio",                              xp: 50,   condition: (s) => s.totalEpisodes >= 1        },
  { id: "ep_10",             icon: "Tv",              label: "Maratonista Iniciante",  desc: "Assista 10 episódios",                                       xp: 80,   condition: (s) => s.totalEpisodes >= 10       },
  { id: "ep_50",             icon: "Clapperboard",    label: "Viciado em Série",       desc: "Assista 50 episódios",                                       xp: 150,  condition: (s) => s.totalEpisodes >= 50       },
  { id: "ep_100",            icon: "Flame",           label: "Sem Parar",              desc: "Assista 100 episódios",                                      xp: 250,  condition: (s) => s.totalEpisodes >= 100      },
  { id: "ep_500",            icon: "Zap",             label: "Lenda da Maratona",      desc: "Assista 500 episódios",                                      xp: 500,  condition: (s) => s.totalEpisodes >= 500      },
  { id: "ep_1000",           icon: "Crown",           label: "Mestre dos Animes",      desc: "Assista 1000 episódios",                                     xp: 1000, condition: (s) => s.totalEpisodes >= 1000     },

  // ── Capítulos ────────────────────────────────────────────
  { id: "first_chapter",     icon: "BookOpen",        label: "Primeiro Capítulo",      desc: "Leia seu primeiro capítulo",                                 xp: 40,   condition: (s) => s.totalChapters >= 1        },
  { id: "ch_20",             icon: "Book",            label: "Leitor Casual",          desc: "Leia 20 capítulos",                                          xp: 80,   condition: (s) => s.totalChapters >= 20       },
  { id: "ch_100",            icon: "BookMarked",      label: "Devorador de Páginas",   desc: "Leia 100 capítulos",                                         xp: 200,  condition: (s) => s.totalChapters >= 100      },
  { id: "ch_500",            icon: "Library",         label: "Mestre do Mangá",        desc: "Leia 500 capítulos",                                         xp: 450,  condition: (s) => s.totalChapters >= 500      },
  { id: "ch_1000",           icon: "Scroll",          label: "Lenda dos Mangás",       desc: "Leia 1000 capítulos",                                        xp: 900,  condition: (s) => s.totalChapters >= 1000     },

  // ── Filmes ───────────────────────────────────────────────
  { id: "first_movie",       icon: "Film",            label: "Sessão de Cinema",       desc: "Assista ao primeiro filme",                                  xp: 60,   condition: (s) => s.totalMovies >= 1          },
  { id: "movie_10",          icon: "Popcorn",         label: "Cinéfilo Otaku",         desc: "Assista 10 filmes",                                          xp: 120,  condition: (s) => s.totalMovies >= 10         },
  { id: "movie_25",          icon: "Tickets",         label: "Festival de Filmes",     desc: "Assista 25 filmes",                                          xp: 250,  condition: (s) => s.totalMovies >= 25         },
  { id: "movie_50",          icon: "Video",           label: "Diretor da Própria Lista", desc: "Assista 50 filmes",                                        xp: 500,  condition: (s) => s.totalMovies >= 50         },

  // ── Conclusões ───────────────────────────────────────────
  { id: "first_complete",    icon: "CheckCircle",     label: "Missão Cumprida",        desc: "Conclua sua primeira obra",                                  xp: 100,  condition: (s) => s.completedTitles >= 1      },
  { id: "complete_5",        icon: "ListChecks",      label: "Finalizador",            desc: "Conclua 5 obras",                                            xp: 200,  condition: (s) => s.completedTitles >= 5      },
  { id: "complete_10",       icon: "Medal",           label: "Colecionador",           desc: "Conclua 10 obras",                                           xp: 300,  condition: (s) => s.completedTitles >= 10     },
  { id: "complete_20",       icon: "Award",           label: "Veterano",               desc: "Conclua 20 obras",                                           xp: 400,  condition: (s) => s.completedTitles >= 20     },
  { id: "complete_50",       icon: "Trophy",          label: "Grande Mestre",          desc: "Conclua 50 obras",                                           xp: 800,  condition: (s) => s.completedTitles >= 50     },

  // ── Lista / Coleção ──────────────────────────────────────
  { id: "list_50",           icon: "FolderOpen",      label: "Biblioteca Viva",        desc: "Tenha 50 títulos na lista",                                  xp: 300,  condition: (s) => s.totalTitles >= 50         },
  { id: "list_100",          icon: "Database",        label: "Lista de Respeito",      desc: "Tenha 100 títulos na lista",                                 xp: 500,  condition: (s) => s.totalTitles >= 100        },
  { id: "list_200",          icon: "Archive",         label: "Arquivo Otaku",          desc: "Tenha 200 títulos na lista",                                 xp: 900,  condition: (s) => s.totalTitles >= 200        },
  { id: "status_10",         icon: "LayoutList",      label: "Organizado Demais",      desc: "Tenha 10 obras com status atualizado",                       xp: 80,   condition: (s) => s.updatedStatuses >= 10     },
  { id: "both_types",        icon: "Scale",           label: "Equilibrista",           desc: "Tenha ao menos 1 anime e 1 mangá na lista",                  xp: 60,   condition: (s) => s.hasAnime && s.hasManga    },
  { id: "multimedia",        icon: "Layers",          label: "Multimídia",             desc: "Tenha ao menos 1 anime, 1 mangá e 1 filme na lista",         xp: 120,  condition: (s) => s.hasAnime && s.hasManga && s.hasMovie },
  { id: "resume_paused",     icon: "PlayCircle",      label: "Voltando à Jornada",     desc: "Retome uma obra pausada",                                    xp: 70,   condition: (s) => s.resumedFromHold >= 1      },
  { id: "finish_paused",     icon: "ShieldCheck",     label: "Não Desisti",            desc: "Conclua uma obra que estava pausada",                        xp: 150,  condition: (s) => s.completedFromHold >= 1    },
  { id: "planned_10",        icon: "CalendarPlus",    label: "Plano de Futuro",        desc: "Adicione 10 obras em Planejo",                               xp: 80,   condition: (s) => s.plannedTitles >= 10       },
  { id: "planned_to_active", icon: "MoveRight",       label: "Meta Pessoal",           desc: "Mova uma obra de Planejo para Assistindo ou Lendo",          xp: 50,   condition: (s) => s.movedFromPlanned >= 1     },

  // ── Social / Posts ───────────────────────────────────────
  { id: "first_post",        icon: "MessageSquare",   label: "Voz da Comunidade",      desc: "Publique seu primeiro post",                                 xp: 30,   condition: (s) => s.totalPosts >= 1           },
  { id: "post_10",           icon: "MessageSquarePlus", label: "Influencer Otaku",     desc: "Publique 10 posts",                                          xp: 120,  condition: (s) => s.totalPosts >= 10          },
  { id: "post_25",           icon: "Megaphone",       label: "Criador Ativo",          desc: "Publique 25 posts",                                          xp: 250,  condition: (s) => s.totalPosts >= 25          },
  { id: "post_50",           icon: "Radio",           label: "Lenda do Feed",          desc: "Publique 50 posts",                                          xp: 450,  condition: (s) => s.totalPosts >= 50          },

  // ── Comentários ──────────────────────────────────────────
  { id: "first_comment",     icon: "MessageCircle",   label: "Primeira Opinião",       desc: "Faça o primeiro comentário",                                 xp: 25,   condition: (s) => s.totalComments >= 1        },
  { id: "comment_25",        icon: "MessagesSquare",  label: "Comentador Frequente",   desc: "Faça 25 comentários",                                        xp: 150,  condition: (s) => s.totalComments >= 25       },
  { id: "comment_100",       icon: "Speech",          label: "Debatedor Nato",         desc: "Faça 100 comentários",                                       xp: 400,  condition: (s) => s.totalComments >= 100      },
  { id: "theory_post",       icon: "Lightbulb",       label: "Teórico Oficial",        desc: "Crie um post com a tag Teoria",                              xp: 80,   condition: (s) => s.theoryPosts >= 1          },
  { id: "review_post",       icon: "Star",            label: "Crítico de Carteirinha", desc: "Crie um post com a tag Review",                              xp: 80,   condition: (s) => s.reviewPosts >= 1          },

  // ── Curtidas ─────────────────────────────────────────────
  { id: "first_like",        icon: "Heart",           label: "Primeiro Like",          desc: "Curta o primeiro post",                                      xp: 20,   condition: (s) => s.likesGiven >= 1           },
  { id: "likes_received_10", icon: "HeartHandshake",  label: "Apoio da Galera",        desc: "Receba 10 curtidas",                                         xp: 100,  condition: (s) => s.likesReceived >= 10       },
  { id: "likes_received_50", icon: "TrendingUp",      label: "Post Estourado",         desc: "Receba 50 curtidas em um único post",                        xp: 300,  condition: (s) => s.maxLikesOnPost >= 50      },

  // ── Comunidades ──────────────────────────────────────────
  { id: "first_community",   icon: "Users",           label: "Primeira Comunidade",    desc: "Entre em uma comunidade",                                    xp: 40,   condition: (s) => s.communitiesJoined >= 1    },
  { id: "communities_5",     icon: "UserPlus",        label: "Membro Ativo",           desc: "Entre em 5 comunidades",                                     xp: 150,  condition: (s) => s.communitiesJoined >= 5    },
  { id: "founded_community", icon: "Building2",       label: "Fundador",               desc: "Crie a primeira comunidade",                                 xp: 100,  condition: (s) => s.communitiesCreated >= 1   },
  { id: "community_10m",     icon: "UsersRound",      label: "Líder de Comunidade",    desc: "Crie uma comunidade com 10 membros",                         xp: 250,  condition: (s) => s.communityMaxMembers >= 10 },
  { id: "community_50m",     icon: "Globe",           label: "Comunidade em Alta",     desc: "Crie uma comunidade com 50 membros",                         xp: 600,  condition: (s) => s.communityMaxMembers >= 50 },

  // ── Amigos ───────────────────────────────────────────────
  { id: "first_friend",      icon: "UserCheck",       label: "Primeiro Amigo",         desc: "Adicione o primeiro amigo",                                  xp: 50,   condition: (s) => s.friendsCount >= 1         },
  { id: "friends_10",        icon: "Users2",          label: "Círculo Otaku",          desc: "Tenha 10 amigos",                                            xp: 200,  condition: (s) => s.friendsCount >= 10        },
  { id: "friends_50",        icon: "Network",         label: "Rede de Nakamas",        desc: "Tenha 50 amigos",                                            xp: 600,  condition: (s) => s.friendsCount >= 50        },

  // ── Eventos ──────────────────────────────────────────────
  { id: "first_event",       icon: "Calendar",        label: "Evento Marcado",         desc: "Crie ou participe do primeiro evento",                       xp: 60,   condition: (s) => s.eventsJoined >= 1         },
  { id: "event_anime",       icon: "Tv2",             label: "Assistir Junto",         desc: "Participe de um evento de anime",                            xp: 80,   condition: (s) => s.animeEventsJoined >= 1    },
  { id: "event_manga",       icon: "BookCopy",        label: "Clube da Leitura",       desc: "Participe de um evento de mangá",                            xp: 80,   condition: (s) => s.mangaEventsJoined >= 1    },
  { id: "events_5",          icon: "CalendarCheck",   label: "Presença Confirmada",    desc: "Participe de 5 eventos",                                     xp: 200,  condition: (s) => s.eventsJoined >= 5         },

  // ── Sequência / Streak ───────────────────────────────────
  { id: "streak_3",          icon: "Flame",           label: "Todo Dia um Episódio",   desc: "Atualize progresso por 3 dias seguidos",                     xp: 100,  condition: (s) => s.currentStreak >= 3        },
  { id: "streak_7",          icon: "Swords",          label: "Sequência Otaku",        desc: "Atualize progresso por 7 dias seguidos",                     xp: 250,  condition: (s) => s.currentStreak >= 7        },
  { id: "streak_weeks_4",    icon: "CalendarRange",   label: "Ritual Semanal",         desc: "Atualize progresso em 4 semanas diferentes",                 xp: 300,  condition: (s) => s.activeWeeks >= 4          },

  // ── Perfil / Onboarding ──────────────────────────────────
  { id: "profile_complete",  icon: "UserCircle",      label: "Perfil Completo",        desc: "Preencha nome, username, avatar e bio",                      xp: 80,   condition: (s) => s.profileComplete           },
  { id: "first_favorite",    icon: "Bookmark",        label: "Obra Favorita",          desc: "Marque uma obra como favorita",                              xp: 30,   condition: (s) => s.favoritesCount >= 1       },
  { id: "top_10_fav",        icon: "BookmarkCheck",   label: "Top 10 Pessoal",         desc: "Favorite 10 obras",                                          xp: 150,  condition: (s) => s.favoritesCount >= 10      },

  // ── Marco Final ──────────────────────────────────────────
  { id: "otaku_supreme",     icon: "ShieldStar",      label: "Otaku Supremo",          desc: "100 eps, 100 caps, 10 obras concluídas e 10 posts",          xp: 2000, condition: (s) => s.totalEpisodes >= 100 && s.totalChapters >= 100 && s.completedTitles >= 10 && s.totalPosts >= 10 },
];

// ── Icon color by category (for visual grouping) ─────────
export function getAchievementColor(id) {
  if (["first_episode","ep_10","ep_50","ep_100","ep_500","ep_1000"].includes(id)) return "text-primary";
  if (["first_chapter","ch_20","ch_100","ch_500","ch_1000"].includes(id)) return "text-chart-2";
  if (["first_movie","movie_10","movie_25","movie_50"].includes(id)) return "text-chart-5";
  if (["first_complete","complete_5","complete_10","complete_20","complete_50"].includes(id)) return "text-chart-4";
  if (["first_post","post_10","post_25","post_50","first_comment","comment_25","comment_100","theory_post","review_post"].includes(id)) return "text-chart-3";
  if (["first_like","likes_received_10","likes_received_50"].includes(id)) return "text-rose-400";
  if (["first_community","communities_5","founded_community","community_10m","community_50m"].includes(id)) return "text-indigo-400";
  if (["first_friend","friends_10","friends_50"].includes(id)) return "text-sky-400";
  if (["first_event","event_anime","event_manga","events_5"].includes(id)) return "text-orange-400";
  if (["streak_3","streak_7","streak_weeks_4"].includes(id)) return "text-amber-400";
  if (id === "otaku_supreme") return "text-yellow-400";
  return "text-muted-foreground";
}