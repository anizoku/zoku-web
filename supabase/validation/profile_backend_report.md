# Bloco de perfil/backend Supabase

## Escopo e decisão

O usuário autorizou a escolha arquitetural após o checkpoint `profile_audit_blocker.md`.
Avatar e banner passam a respeitar a visibilidade do perfil. Os buckets são privados;
o dono gerencia a própria pasta e os visitantes só leem o arquivo atualmente selecionado
de um perfil ao qual já têm acesso. Uploads ainda não selecionados e arquivos substituídos
não são compartilhados. O acesso administrativo já existente na RLS foi preservado.

Fundamentação: [buckets privados no Supabase](https://supabase.com/docs/guides/storage/buckets/fundamentals)
aplicam RLS também aos downloads. A [view security_invoker do PostgreSQL](https://www.postgresql.org/docs/17/sql-createview.html)
exige privilégios na origem e aplica as políticas do chamador. Por isso, mantemos a view
invoker e concedemos SELECT somente nas colunas públicas da tabela de origem.

Não houve avanço para social, alteração de regras de amizades/XP/listas nem migração de
autenticação do frontend Base44. `favorite_mangas` permanece legado, fora do RPC de edição.
Favoritos de anime continuam sendo strings de apresentação: não se inventou uma FK de
catálogo, limite de quantidade ou uma conversão de títulos em slugs.

## Migrations novas

- `20260920010000_secure_profile_rpcs.sql`: revoga privilégios de escrita de tabela **e de
  coluna**, remove policies de escrita, restringe SELECT às colunas da view pública,
  cria `get_my_profile`, endurece signup/onboarding/update e assegura que o badge
  selecionado continue pertencendo ao usuário mesmo após revogação da conquista.
- `20260920011000_private_profile_media.sql`: torna buckets privados, aplica leitura de
  mídia pela RLS do perfil e vínculo atual, vincula crops ao path canônico e atualiza
  `set_avatar`/`set_banner` para verificar Storage e limpar crop na troca de imagem.

Nenhuma migration anteriormente aplicada foi editada.

## Contrato para consumidores Supabase

| Operação | Caminho autorizado |
| --- | --- |
| Perfil do próprio usuário, incluindo preferências/onboarding | `rpc('get_my_profile')`; identidade exclusivamente por `auth.uid()` |
| Perfis de apresentação | `from('public_profiles').select(...)`; RLS public/friends/private |
| Concluir onboarding | `complete_profile_setup(p_username, p_display_name, p_preferred_language)` |
| Editar dados e favoritos | `update_profile(p_updates)` |
| Enviar avatar/banner | Storage API em `avatars/<auth.uid()>/...` ou `profile-banners/<auth.uid()>/...` |
| Associar mídia existente | `set_avatar(p_path)` / `set_banner(p_path)` |
| Remover associação | `remove_avatar()` / `remove_banner()`; depois excluir arquivo pela Storage API |
| Ler imagem | Storage `download(path)` com JWT do visitante; transformar Blob em object URL no consumidor |

`profiles.select('*')`, escrita direta e escrita pela view são negados. A leitura direta
das colunas públicas continua submetida à mesma RLS da view; não expõe preferências,
metadados de importação, role, streaks nem timestamps de onboarding. `get_my_profile`
retorna o próprio perfil, excluindo `legacy_base44_id`; não recebe um ID arbitrário.

Onboarding aceita username de 3–24 caracteres conforme as regras existentes, display name
de 1–50 caracteres e idiomas `pt`/`en`. Normaliza espaços e idioma. Conclusão repetida
retorna `ALREADY_COMPLETED` sem alterar dados ou timestamp: alterações posteriores usam
`update_profile`. Nomes longos/vazios de metadados de Auth não impedem signup. Colisões
de username temporário geram outro placeholder sem impedir criação do perfil.

`update_profile` aceita apenas username, display_name, bio, country, preferred_language,
avatar_crop, banner_crop, links, favorite_animes, selected_badge_id, list_visibility,
profile_visibility, push_enabled e achievement_sound_enabled. Tipos JSON são verificados.
O patch é atômico e exige onboarding concluído. As URLs de avatar/banner são rejeitadas.

- `country`: trim + uppercase; duas letras ASCII, vazio/null limpa o valor.
- `bio`: trim, até 300 caracteres; vazio/null limpa.
- `favorite_animes`: array JSON unidimensional de strings não vazias; trim em cada item,
  ordem preservada; `[]` limpa e nunca grava NULL. Números, objetos, nulls e arrays aninhados são rejeitados.
- `links`: mantém chaves instagram/x/tiktok/youtube/website e validações existentes;
  `{}` limpa; JSON null é inválido.
- `avatar_crop`/`banner_crop`: formato v2 existente; `imageUrl` deve ser o mesmo **path**
  armazenado no respectivo campo, nunca URL externa, assinada ou blob. JSON null limpa
  o crop. Trocar imagem limpa a geometria antiga; selecionar o mesmo path a preserva.
- `selected_badge_id`: somente conquista existente e desbloqueada; null/vazio limpa.
  FK composta assegura integridade concorrente e limpa seleção se o backend revogar o desbloqueio.
- `list_visibility` e `profile_visibility`: mantêm public/friends/private. Favoritos
  continuam campos de apresentação regidos por profile_visibility, conforme a view anterior;
  nenhuma policy de anime_entries foi alterada.

Mídia pode ser enviada/associada durante onboarding, como antes. Limites mantidos:
avatar 5 MiB, banner 10 MiB; JPEG, PNG e WebP. Paths e crops persistem no banco;
URLs temporárias pertencem somente à camada de apresentação. Para um visitante sem sessão,
o JWT anon permite baixar a mídia selecionada de perfis públicos.

Exemplo para o consumidor futuro (não muda a autenticação Base44 atual):

```js
const { data: profile, error } = await supabase.rpc('get_my_profile');
if (error) throw error;
const { data: blob, error: downloadError } = await supabase.storage
  .from('avatars').download(profile.avatar_url);
if (downloadError) throw downloadError;
const imageSrc = URL.createObjectURL(blob);
// Exibir imageSrc; chamar URL.revokeObjectURL(imageSrc) no cleanup.
// Persistir profile.avatar_url no crop.imageUrl, nunca imageSrc.
```

Novos downloads verificam a visibilidade atual. Bytes já baixados não podem ser revogados.
URLs assinadas são capacidades transferíveis até expirar; por isso o contrato preferido
usa download com JWT e não URLs públicas permanentes nem assinadas persistidas.

## Auditoria remota anterior ao deploy

Consulta somente de leitura: 2 perfis, 0 referências de avatar/banner, 0 objetos nos buckets,
0 badges selecionados sem desbloqueio. Políticas, limites e funções de perfil foram
inspecionados. Nenhum arquivo remoto existente precisa de conversão de URL. O histórico
de 24 migrations estava alinhado antes das duas novas.

## Validação reproduzível

```powershell
npx supabase migration up
npx supabase test db
node supabase/validation/profile_http_test.mjs
npx supabase db lint --local --level warning
npx supabase db reset
# Repetir as suítes depois do reset antes de db push.
```

A suíte pgTAP usa transação e rollback: 123 asserções sobre privilégios reais, escrita
direta/view, dados privados, signup/onboarding, validações, favoritos, atomicidade, badges,
Storage, crops e matriz dono/amigo aceito/pendente/admin/anon. A suíte HTTP recusa qualquer
host não local, captura chaves do CLI sem imprimi-las, cria fixtures isoladas e remove-as
pelas APIs em finally: 84 verificações com Auth, JWTs reais, PostgREST e uploads/downloads
reais. Inclui MIME, tamanho, upsert, movimento, exclusão e assinatura indevidos.

Resultados antes do reset: **123/123 pgTAP; 84/84 HTTP; db lint sem erros**.
`db reset` local: **concluído**, reconstruindo as 26 migrations. Apenas aviso esperado de
ausência de `supabase/seed.sql`; o schema não depende de seed.

Resultados após reset: **123/123 pgTAP; 84/84 HTTP; db lint sem erros**. Fixtures HTTP
foram removidas via Auth/Storage APIs; a consulta local posterior confirmou zero perfis.

`npx supabase db push --dry-run`: listou somente as duas migrations novas.
`npx supabase db push`: **concluído**, depois de todas as validações acima.
`npx supabase migration list`: **26/26 migrations alinhadas** entre local e remoto.

`profile_checkpoint.sql`, executado com `db query --local` e `db query --linked`, confirmou
RLS ativa, view invoker, ausência de escrita de tabela/coluna pelos clientes, ausência de
leitura das colunas privadas, acesso às colunas públicas, dois buckets privados e constraints
de badge/crops validadas. Todos os nove indicadores booleanos retornaram true nos dois bancos.
O hash das definições dos oito RPCs/triggers de perfil é idêntico:
`b31429c90a8b5aa9eca32e2cc6e3d7cb`. Os dois perfis remotos foram preservados.

Commit de implementação e testes: `8b6e560` (`fix(supabase): secure profile RPCs and private media access`).
A documentação e a consulta de checkpoint constituem um segundo bloco de commit.

## Limite de integração

O frontend no repositório ainda chama Base44. Seu corte para Supabase deve consumir este
contrato; não foi alegada integração de interface que ainda não existe. Nenhum trecho
de código do frontend foi parcialmente alternado para Supabase nesta entrega de backend.
O arquivo preexistente `supabase/snippets/Untitled query 296.sql` foi preservado.
