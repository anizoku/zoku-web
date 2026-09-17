# RPCs de negócio — revisão local da migration 0002

**Arquivo:** `supabase/migrations/0002_business_rpcs.sql`.

**Parecer: PARTIAL GO para avançar a testes locais isolados, quando autorizados.** As oito RPCs estão implementadas e passaram nos testes estáticos. Não é aprovação para produção. O caminho de import de XP legado está deliberadamente bloqueado por ausência de fonte confiável; as decisões de contrato abaixo devem ser consideradas nos testes. Nenhuma migration foi aplicada, nenhum dado foi criado e nenhum banco remoto foi consultado ou alterado.

## Escopo

Apenas oito `CREATE FUNCTION`, oito `REVOKE`, oito `GRANT`, `BEGIN` e `COMMIT`. Não há alterações em 0001, tabelas, RLS, triggers, frontend, seeds ou funções adicionais. Os arquivos auxiliares novos contêm apenas esta revisão e um verificador offline.

Fontes: `supabaseSchemaMapping.md` seção 7, `xpSecurityHardeningReport.md`, as funções Base44 correspondentes, `base44/shared/xpConstants.ts` e as condições/descrições de `src/lib/achievements.js`.

Todas as funções retornam **jsonb**, usam **LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''**, e extraem a identidade exclusivamente de **auth.uid()**. As relações e tipos da aplicação têm schema explícito. `EXECUTE` é concedido somente a `authenticated`, após revogar privilégios de `PUBLIC`, `anon`, `authenticated` e `service_role`. Não se aceita user_id, XP, chave de idempotência, nível ou estatísticas arbitrárias como argumentos.

O owner das funções deve ser o papel confiável de migrations, com acesso às tabelas de 0001 e às leituras especificadas em `auth.users`. A presença de `SECURITY DEFINER` exige os checks de identidade/ownership dentro das funções; não se presume que RLS proteja uma consulta feita pelo owner. Referência: [PostgreSQL — CREATE FUNCTION](https://www.postgresql.org/docs/current/sql-createfunction.html).

## Assinaturas e tabelas

R = leitura; I = INSERT; U = UPDATE; D = DELETE. Locks não alteram dados. A lista descreve acessos explícitos; FKs e triggers de 0001 permanecem ativos.

| Assinatura | Tabelas |
|---|---|
| `update_progress(entry_id uuid, action text, value integer DEFAULT NULL) → jsonb` | `anime_entries` R/U; `work_releases` R; `xp_events` I; `profiles` R/U |
| `unlock_achievement(achievement_id text) → jsonb` | `profiles` R/U; `user_achievements` R/I; `xp_events` R/I; leitura de `achievements`, `anime_entries`, `work_releases`, `works`, `posts`, `post_likes`, `comments`, `friendships`, `communities`, `community_members`, `events`, `event_participants`, `watch_together`, `auth.users` |
| `grant_xp(event_type text, source_id text DEFAULT NULL) → jsonb` | `anime_entries`, `posts` R; `xp_events` R/I; `profiles` R/U, inclusive via `is_admin()` |
| `send_friend_request(receiver_id uuid) → jsonb` | `auth.users` R; `friendships` R/I; `notifications` I |
| `accept_friend_request(friendship_id uuid) → jsonb` | `friendships` R/U; `notifications` I |
| `reject_friend_request(friendship_id uuid) → jsonb` | `friendships` R/D |
| `cancel_friend_request(friendship_id uuid) → jsonb` | `friendships` R/D |
| `remove_friend(friendship_id uuid) → jsonb` | `friendships` R/D |

`receiver_id` é o destinatário da relação, não uma identidade em nome da qual o cliente pode agir. Todas as outras identidades vêm da sessão e da linha bloqueada.

## Autoridade e atomicidade de XP

As três RPCs de XP bloqueiam primeiro a linha de `profiles` do usuário. Isso serializa decisões de XP/streak/achievements entre elas. Perfil ausente retorna `PROFILE_REQUIRED`; nenhuma RPC cria um perfil implicitamente. Depois, fontes relevantes são bloqueadas para a validação: entry com `FOR UPDATE` em progresso, post/entry com `FOR SHARE` em grant e catálogo de conquista com `FOR SHARE` em unlock. O total da release é lido sob `FOR SHARE`.

Eventos usam a constraint `uq_xp_events_user_id_idempotency_key` com `ON CONFLICT ... DO NOTHING`; os retornos de XP somam somente linhas efetivamente inseridas. Repetições retornam zero XP novo. Streak só avança quando há XP positivo novo, usando dia UTC e UPDATE protegido contra repetição no mesmo dia. Eventos de nível valem zero e não avançam streak.

Todas as escritas de uma chamada fazem parte da mesma transação PostgreSQL. Falhas SQL inesperadas propagam e desfazem as escritas da chamada. Não há `WHEN OTHERS` que converta um erro após escrita em sucesso parcial, nem commits dentro das funções. Referência sobre locks: [PostgreSQL — Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html).

### update_progress

- Ações exatas: `increment`, `decrement`, `set_progress`, `complete`; apenas `set_progress` aceita `value` obrigatório, inteiro não negativo.
- Entry deve pertencer ao usuário. Registro inexistente ou de terceiro retorna `SOURCE_NOT_FOUND`, sem revelar ownership de terceiros.
- Categoria da release deve ser compatível com anime/manga; `work_id`, quando informado na entry, deve concordar com a release.
- WorkRelease tem precedência sobre totais da entry, inclusive se o total canônico for zero. Somente NULL permite fallback para o total da entry, que 0001 protege contra escrita do cliente.
- Sem total conhecido, bloqueia aumento/conclusão com `TOTAL_UNKNOWN`; redução continua permitida. Total zero não pode gerar XP de conclusão.
- Valida máximo canônico e overflow. Um salto concede no máximo 10.000 unidades por chamada; saltos maiores retornam `BATCH_TOO_LARGE` antes de escrever. Não há truncamento silencioso.
- Releasing não faz auto-complete. A ação explícita `complete` pode concluir até o total conhecido, conforme o backend de referência.
- Diminuir via decrement ou set_progress reabre entry concluída para watching/reading; nunca remove XP. Re-incremento não recompensa novamente as mesmas unidades.
- XP por unidade: anime 10; manga 7. Conclusão: anime 150; manga 100. Progresso, eventos e streak mudam juntos.
- `completed` representa o estado final da entry, não somente se ocorreu uma transição nesta chamada.

### Idempotência estável de catálogo

O mapping exemplificava chaves por entry UUID. Como 0001 permite excluir e recriar entries, isso permitiria repetir XP para a mesma release. Para entries com release, 0002 usa:

- `episode:release:{release_uuid}:{n}` / `chapter:release:{release_uuid}:{n}`;
- `completion:release:{release_uuid}`;
- `entry:release:{release_uuid}:created` para `anime_added`.

`source_id` continua contendo a entry UUID que originou o evento. Sem release, as chaves usam a entry UUID (`episode:entry:{uuid}:{n}`, `chapter:entry:{uuid}:{n}`, `completion:entry:{uuid}`, `entry:{uuid}:created`). Essa exceção não deduplica obras sem vínculo canônico por título. Ela exige totais provisionados pelo backend para progresso; títulos arbitrários não recebem progresso ilimitado.

Esse contrato se destina ao schema novo/reset seletivo planejado. Caso haja ledger antigo, não misturar formatos de chave sem uma estratégia explícita de conversão/deduplicação.

### grant_xp

- `post_created` e `anime_added`: `source_id` precisa ser UUID válido e uma fonte pertencente ao usuário; XP fixo 20/15.
- `level_up`: exige `source_id = NULL`, calcula nível atual a partir do ledger com a curva cumulativa canônica e limite 100; só registra nível >= 2. Não aceita nível declarado pelo cliente.
- Rejeita episódios, capítulos, ranges, conclusão, achievements e qualquer evento fora da whitelist.
- `legacy_migration`: não-admin recebe `FORBIDDEN`; admin recebe `LEGACY_MIGRATION_DISABLED`. Não há saldo confiável de import no schema nem parâmetro seguro para recebê-lo no contrato de dois argumentos. Não foi reintroduzido o antigo `xp_amount` arbitrário do Base44. Isso requer uma decisão de import, fora destas oito RPCs.

### unlock_achievement

Há **74 chaves**, cada uma com condição e valor fixo, comparados estaticamente com `xpConstants.ts`. A chave também precisa existir em `achievements`; esta migration não cria catálogo/seed. `achievements.xp` não é autoridade para recompensas.

Estatísticas vêm das tabelas reais: progresso protegido, categorias e gêneros do catálogo, ledger para nível, amizades aceitas, likes e memberships das junctions, comentários, eventos e watch-together. Não há payload de estatísticas. Badge selecionado só qualifica se a conquista correspondente já pertence ao usuário. Comunidade com dez membros precisa ser criada pelo usuário; comentário recebido exclui o próprio autor.

As quatro limitações históricas do Base44 foram implementadas com fatos agora disponíveis:

- `five_genres`: pelo menos cinco gêneros canônicos distintos, normalizados por trim/lower, nas obras da lista;
- `first_comment`: existe comentário do usuário;
- `streak_weeks_4`: inclusões na biblioteca em quatro semanas UTC distintas — a descrição canônica não exige semanas consecutivas;
- `same_day_complete`: evento de conclusão gerado pelo backend e criação da entry no mesmo dia UTC, com referência e usuário consistentes.

`four_categories` mantém a condição canônica de três categorias apesar do nome histórico. `founder` verifica os dez primeiros `auth.users` por `created_at, id`; preservar significado histórico no import depende da política de datas das contas. `login_streak` e estado completed de watch-together são lidos como estado backend protegido; produzir esses estados não faz parte destas oito RPCs.

## Máquina de estados de amizade

| Operação | Ator | Pré-condição | Efeito |
|---|---|---|---|
| send | remetente da sessão | destinatário existe e não é o próprio; par ausente | cria pending e notificação na mesma chamada |
| accept | receiver | pending | accepted e uma notificação ao requester |
| reject | receiver | pending | exclui pedido; retorna REJECTED |
| cancel | requester | pending | exclui pedido; retorna CANCELLED |
| remove | requester ou receiver | accepted | exclui amizade; retorna REMOVED |

As mutações bloqueiam a linha com `FOR UPDATE` e filtram ator/estado. O índice único LEAST/GREATEST de 0001 resolve pedidos simultâneos/invertidos. Um envio repetido retorna `ALREADY_PENDING`, `INCOMING_REQUEST` ou `ALREADY_FRIENDS`; nunca aceita automaticamente um pedido inverso. Aceite repetido pelo receiver retorna `ALREADY_ACCEPTED`, sem nova notificação. Se o conflito de um envio desaparecer por cancelamento concorrente, retorna `RETRY` sem efeitos.

Rejeição usa a opção DELETE expressamente permitida no mapping. Permite novo pedido futuro; não define cooldown ou bloqueio de usuário. Linhas `rejected` provisionadas externamente não são reabertas por estas RPCs. Notificações existentes são registros históricos e não são apagadas ao cancelar/rejeitar/remover. UUID inexistente/de terceiro retorna `FRIENDSHIP_NOT_FOUND`; ator autorizado com estado errado recebe `INVALID_STATE`.

## Testes estáticos executados

`python supabase/validation/validate_business_rpcs.py`:

- 26 statements: exatamente oito funções e ACLs restritos, sem alteração de tabelas/RLS;
- oito corpos PL/pgSQL e **237 statements/expressões SQL internos** aceitos pelo parser PostgreSQL;
- assinaturas, jsonb, VOLATILE, SECURITY DEFINER, search_path vazio e identidade auth.uid();
- referências a tabelas/colunas de escrita, campos de rowtypes e constraints comparadas com 0001;
- conjuntos de tabelas de escrita por RPC, guards de ownership/estado, locks, idempotência e separação das autoridades;
- paridade dos 74 valores de XP e cobertura de uma condição real para cada chave;
- nenhuma função adicional de grant genérico, execução SQL dinâmica ou catch-all.

`python supabase/validation/validate_initial_schema.py` também passou: 547 statements, 32 tabelas e 53 FKs; 0001 não foi alterada nesta tarefa.

Esses checks **não** são execução de funções. Não comprovam resolução de todos os nomes/tipos em runtime, permissões reais herdadas, comportamento de RLS, plano/custo, deadlocks, efeitos de cascades ou concorrência.

## Matriz para o próximo teste local, ainda não executado

1. Aplicar 0001/0002 apenas em ambiente descartável autorizado, com auth roles equivalentes ao Supabase; provisionar usuários/perfis/catálogo de teste fora desta migration.
2. Testar anon sem EXECUTE, autenticação ausente, usuário A tentando fontes de B e manipulação direta das tabelas/colunas bloqueadas por 0001.
3. Progresso: ações/NULL/limites inválidos, total nulo/zero, divergência de categoria/work, autoridade da release sobre fallback, airing, conclusão manual, redução/re-incremento, saltos grandes e mudança posterior do total.
4. Idempotência: repetir conclusão, unlock e grant; excluir/recriar entry da mesma release; executar chamadas simultâneas em uma entry e em entries distintas do mesmo usuário. Conferir XP efetivo e streak.
5. Falha transacional: provocar erro de INSERT no ledger e na notificação para verificar rollback integral de progresso/conquista/amizade, sem estado parcial.
6. Conquistas: exercitar condições verdadeiras/falsas, catálogo ausente, XP display alterado, badge de outro usuário, contadores divergentes, 74 chaves e as quatro antes não suportadas.
7. Amizades: autoamizade, usuário ausente, pedidos cruzados/simultâneos, ator errado, aceite duplicado, aceite/cancelamento concorrentes, rejeição de accepted e remoção de pending. Conferir ausência de notificações duplicadas.
8. Grant: tentar todos os eventos proibidos, fonte inválida/de terceiro, level_up com nível alegado e legado como admin/não-admin. Verificar que legacy permanece sem crédito.

**Encerramento:** PARTIAL GO para testes locais autorizados, com o caminho legado bloqueado e os contratos acima explícitos. Nenhuma aplicação, `db push`, deploy ou alteração de banco foi realizada nesta tarefa.
