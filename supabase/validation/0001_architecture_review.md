# Revisão arquitetural da migration 0001

Data: 2026-09-15. Escopo: revisão e correção local, sem aplicar SQL, criar dados, acessar banco remoto ou fazer deploy.

**Parecer: NO-GO para aplicar agora.** O arquivo passou a representar a fundação do schema Supabase planejado. A arquitetura funcional completa ainda depende das RPCs e dos preparativos descritos abaixo. A validação realizada foi estática; não comprova execução em PostgreSQL/Supabase.

## Fontes e precedência

- `src/lib/canonicalSystemDocument.md`, principalmente partes 5–7.
- `src/lib/supabaseSchemaMapping.md`, principalmente princípios P1–P7, schema detalhado da seção 4 e matrizes das seções 5–7.
- `src/lib/xpSecurityHardeningReport.md`, especialmente identidade, idempotência, autoridade backend e atomicidade transacional no Supabase.
- `base44/shared/xpConstants.ts`, somente para a fórmula de nível usada no snapshot de autor.

O mapping detalhado é a especificação de destino; exemplos legados por email no documento geral não se sobrepõem ao princípio explícito de identidade UUID. Os nomes adotados são `profiles`, `works`, `events`, `watch_together` e `work_category_visibilities`. Não foram criadas aliases para perpetuar o contrato Base44.

## Problemas encontrados e correções

| Prioridade | Antes | Correção local |
|---|---|---|
| P0 | PKs de entidades em TEXT copiavam ObjectIds Base44; identidades UUID opcionais | PKs UUID com geração automática; `profiles.id` é PK/FK de `auth.users`; import metadata em `legacy_base44_id UNIQUE` separado |
| P0 | Ownership e RLS tinham caminhos por email e identidade legada | Relações pessoais por UUID/FK; nenhum helper de ownership por email ou `id_mapping` |
| P0 | XP sem `idempotency_key`, tipos ausentes e sem unicidade | Chave obrigatória e não vazia, `UNIQUE(user_id, idempotency_key)`, `anime_added`/`legacy_migration`, source metadata e FK de achievement |
| P0 | XP e achievements permitiam escrita direta por cliente com papel admin | Somente SELECT para os papéis de API; nenhum grant/policy de INSERT/UPDATE/DELETE, inclusive para app admin. Backend confiável usa service role ou futuras RPCs |
| P0 | Progresso podia ser falsificado por INSERT/UPDATE de cliente | INSERT sem campos de progresso, totais ou status; defaults zero/planned. Nenhum UPDATE de cliente em `anime_entries`, como a matriz canônica determina |
| P0 | Amizades duplicáveis A→B/B→A e transições por update livre | Endpoints obrigatórios, CHECK contra autoamizade, índice único LEAST/GREATEST e nenhuma escrita direta de cliente |
| P0 | Receiver podia editar a mensagem inteira | UPDATE somente da coluna `read_at`, RLS para receiver e trigger de imutabilidade de todas as outras colunas; sem DELETE de cliente |
| P1 | Likes/membros/participantes em arrays | `post_likes`, `comment_likes`, `community_members`, `event_participants`, cada uma com UUIDs, FKs CASCADE e UNIQUE do par |
| P1 | Counters alteráveis por cliente | Triggers atômicos para likes, comentários, membros e releases; grants excluem counters tanto no INSERT quanto no UPDATE |
| P1 | Ausência de UNIQUEs e CHECKs de negócio | Unicidade de username, slug de obra, release por obra, provider/id, achievements por usuário e junctions; CHECKs de enum, progresso, rating, contadores e identidades |
| P1 | FKs incompletas, identidades nullable e DELETE sem distinguir ownership | 53 FKs com ações explícitas e tipos compatíveis; CASCADE para dados dependentes, SET NULL para referências opcionais |
| P1 | `sync_logs.run_id` referenciava `sync_runs.run_id` antes do UNIQUE | Tabelas descartáveis de sync não fazem parte deste schema alvo. Todas as FKs novas vêm depois de suas tabelas e constraints de unicidade |
| P1 | Helpers SECURITY DEFINER sem search_path fixo; grants dependiam de defaults | Funções com `search_path = ''`, referências qualificadas, REVOKEs explícitos e EXECUTE concedido apenas aos helpers de leitura necessários |
| P1 | Role e streaks não tinham proteção de coluna suficiente | `profiles.role` e streaks não aparecem nos grants de INSERT/UPDATE do cliente, evitando promoção a admin e falsificação de streak |
| P1 | Visibilidade de eventos poderia vazar por comentários/participantes | Helper de visibilidade sem recursão RLS; comentários e participantes respeitam acesso ao evento; join privado não é liberado ao cliente |
| P2 | Modelo de destino omitido em favor de campos legados | 32 tabelas da seção 4, timestamps padronizados e `read_at`; retirada de CatalogSync, MediaWork e histórico de sync descartáveis |

`achievements.key TEXT PRIMARY KEY` é a exceção intencional: chave natural estável do catálogo, explicitamente prevista na seção 4.8; não é um ID Base44.

`source_id` de XP e `reference_id` de notificações/reports continuam TEXT polimórfico conforme o mapping, sem uma FK fictícia para múltiplas tabelas. As futuras autoridades backend precisam validar tipo, existência e ownership da referência. Nenhum desses campos é usado para autenticar o usuário.

Arrays de categorias, gêneros, tags e favoritos foram mantidos como atributos conforme o schema detalhado. Arrays de likes, membros, participantes ou emails não existem no schema corrigido.

## Decisões técnicas tomadas

- `communities.creator_id` aceita NULL: o mapping dizia simultaneamente NOT NULL e ON DELETE SET NULL. Foi preservada a política de manter a comunidade quando o criador é removido.
- `anime_entries.rating` usa `numeric(3,1)` com CHECK 1–10: `numeric(2,1)` da proposta não comporta 10.0.
- Slugs duplicados precisam ser resolvidos no import; não justificam remover UNIQUE de um schema novo. Nenhum dado foi deduplicado ou removido nesta revisão.
- `legacy_base44_id` é somente rastreabilidade de import, sem grant de escrita para cliente. Um merge de vários IDs Base44 em uma obra exigirá mapa externo/staging de aliases; uma coluna não representa vários IDs antigos.
- `profiles` concentra role; não existe tabela duplicada `user_roles`. O primeiro admin precisa ser provisionado por um processo confiável, nunca pelo cliente.
- A relação pai/filho de comentários também valida o mesmo `post_id`. `work_releases.work_slug` tem FK composta para não divergir do `work_id`.
- `site_config.label` é UNIQUE conforme a proposta. Um override sem categoria também é único por obra via índice parcial.
- `activity_feed` fica com escrita somente backend para impedir fabricação de eventos sociais. `watch_together` permite criação pending e remoção pelo iniciador, mas não update livre de estado/endpoints. São restrições deliberadas adicionais à matriz genérica; os fluxos correspondentes precisam de contratos de backend.
- Favoritos permanecem no formato de atributos da proposta; a revisão não inventou uma nova taxonomia ou tabelas de favoritos.
- Nenhum grant genérico de UPDATE foi usado para compensar RPC ausente. Não há stubs de negócio que aparentem implementar autoridade de XP.

## Pendências antes de aplicar / liberar uso

1. **Escopo da aplicação:** decidir se 0001 será aplicada como fundação isolada, com funcionalidades bloqueadas, ou acompanhada das próximas migrations. As oito RPCs de negócio não existem aqui: `grant_xp`, `update_progress`, `unlock_achievement`, `send_friend_request`, `accept_friend_request`, `reject_friend_request`, `cancel_friend_request`, `remove_friend`. As oito funções presentes são helpers/triggers, não essas RPCs.
2. **RPCs transacionais:** portar cálculos/condições do backend canônico, obter identidade de `auth.uid()`, bloquear a entry com `SELECT ... FOR UPDATE`, resolver total de WorkRelease, construir chaves server-side, inserir XP com conflito idempotente e atualizar progresso/streak na mesma transação. Preservar decremento sem remoção de XP, re-incremento idempotente e ausência de auto-complete para obras em exibição. Validar conquistas reais, inclusive a decisão sobre as quatro conquistas atualmente não suportadas. Valores de XP do catálogo são display-only.
3. **Contratos sociais:** definir transições seguras de watch-together, convites privados, criação de notifications/activity_feed e snapshots de nomes restantes. Join público/friends valida capacidade; convites privados não foram inventados. Rating/notes de entries também precisam de uma operação de backend, pois a matriz escolhida bloqueia todo UPDATE direto.
4. **Import e nomenclatura:** confirmar adoção dos nomes da seção 4 nos consumidores e preparar mapa Base44→UUID, resolução de slugs duplicados e política de reset seletivo. Dados legados não são compatíveis com carga direta deste SQL. Nenhum reset/import ocorreu.
5. **Ambiente de destino:** verificar, em tarefa autorizada separada, se há objetos, extensões, funções, grants ou dados existentes. Histórico de migrations vazio não prova schema vazio. Este arquivo é uma migration inicial para schema novo, não um upgrade automático do DDL antigo.
6. **Validação de execução:** após autorização explícita, testar em ambiente isolado RLS com anon/usuários distintos/app admin/service role, tentativas de INSERT/UPDATE/UPSERT em colunas protegidas, cascades, privacidade, concorrência de likes e joins, e depois atomicidade/replay das futuras RPCs. Nada disso foi executado nesta revisão.
7. **Auxiliares antigos:** `supabase/rollback/0001_rollback.sql` e `supabase/validation/0001_validation_queries.sql` ainda descrevem o DDL anterior. Não executar esses scripts contra o schema novo sem revisá-los. Eles foram preservados; não foi preparado nem executado rollback destrutivo. O relatório anterior em `src/lib/supabaseDDLReviewReport.md` não aprova esta versão.
8. **Integração completa:** os seis buckets/policies Storage, Realtime, Edge Functions e adaptação do frontend são trabalho posterior. Não há provisioning nem deploy neste arquivo.

## Validação realizada

Comando local: `python supabase/validation/validate_initial_schema.py` (dependência `pglast`).

- Parser PostgreSQL: 547 statements aceitos.
- Parser PL/pgSQL: cinco corpos de triggers aceitos; corpos dos três helpers SQL também parseados.
- Auditoria offline: 32 tabelas com RLS, 53 FKs com tipos/targets/ordem/ON DELETE consistentes, PKs canônicas, UNIQUEs críticos e grants de API protegidos.
- `git diff --check` no SQL: sem erros de whitespace.
- Não houve conexão com banco, execução da migration, `db push`, criação de dados ou deploy.

Permissões de coluna e RLS são mecanismos complementares: [PostgreSQL — Privileges](https://www.postgresql.org/docs/current/ddl-priv.html) e [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html). O teste estático não avalia permissões herdadas do ambiente, resultados reais de policies, planos, execução de triggers ou concorrência.

**Conclusão:** problemas estruturais e permissões inseguras do DDL local corrigidos; arquitetura funcional e aplicação ainda não aprovadas. NO-GO para aplicação neste momento. Revisão encerrada sem ações no banco.
