# Auditoria de perfil — checkpoint interrompido

Data: 2026-09-19. Escopo: perfil/backend Supabase; sem avanço para social.

## Estado e evidências

- `npx supabase migration list`: as 24 migrations locais constam também no remoto, até `20260919232943`. Isso confirma o histórico, não a ausência de drift no schema remoto.
- Consulta ao PostgreSQL local via `docker exec supabase_db_zoku-web psql`: `anon` possui SELECT de tabela em `public.profiles`; `authenticated` possui UPDATE nas colunas `avatar_url` e `favorite_animes`; INSERT em `id` está negado.
- A policy `profiles_select` permite dono, administrador, perfis públicos e amigos de perfis friends. Quando uma linha é visível, o SELECT de tabela também permite ler preferências e metadados internos, como `push_enabled`, `achievement_sound_enabled`, `legacy_base44_id` e estado de onboarding.
- `public_profiles` usa `security_invoker=true` e projeta campos de apresentação. Ela respeita a RLS, mas não impede acesso direto à tabela de origem. Revogar simplesmente o SELECT na origem também quebra a view invoker; a correção precisa tratar conjuntamente a leitura pública e a leitura privada do próprio usuário.
- Ambos os buckets, `avatars` e `profile-banners`, têm `public=true` no banco local e nas migrations. As policies de objetos restringem gerenciamento/listagem à pasta do usuário. A própria migration `20260919053028` registra que arquivos continuam acessíveis publicamente por URL.

## Decisão necessária antes de modificar o contrato

Avatares e banners de perfis friends/private devem continuar acessíveis a qualquer pessoa que conheça a URL, ou a privacidade deve abranger os arquivos?

O comportamento atual é mídia pública. Preservá-lo mantém URLs existentes; exigir privacidade dos arquivos requer buckets privados, leitura autorizada e adaptação do consumidor de imagens. Isso não deve ser escolhido implicitamente durante o endurecimento de RPCs. A execução foi interrompida conforme a instrução do usuário de parar e documentar riscos reais ou decisões arquiteturais ambíguas.

## Achados adicionais da revisão estática

- `update_profile` aceita `avatar_url` e `banner_url` e não verifica existência em Storage, contornando os RPCs dedicados.
- `favorite_animes` não integra a allowlist de `update_profile`; depende da permissão direta que precisa ser removida. O contrato atual é `text[] NOT NULL DEFAULT '{}'`; não foi inventada relação com catálogo nem limite novo.
- `country` recebe apenas trim no RPC, enquanto a constraint exige duas letras maiúsculas. Normalizar com upper/trim no fluxo seguro resolve a incoerência sem alterar o formato existente.
- `complete_profile_setup` precisa de revisão de nulls e repetição: suas verificações explícitas não rejeitam todos os nulls e uma segunda chamada atualiza o perfil já concluído.
- `handle_new_user` copia nome de metadados sem normalização ou limite; nomes acima de 50 caracteres ou apenas espaços podem conflitar com a constraint posteriormente adicionada e bloquear signup.
- Campos escalares de `update_profile` usam extração textual/casts sem validar sistematicamente o tipo JSON recebido.
- Crops contêm `imageUrl` livre: revisar o consumidor e a consistência com a mídia escolhida para não manter outro caminho de substituição da imagem. JSON null não equivale a SQL NULL na constraint existente de crops.
- O trigger de `selected_badge_id` valida catálogo e desbloqueio ao inserir/alterar o campo. Ainda falta testar o ciclo de remoção de conquistas e o efeito sobre seleção já existente.
- O frontend encontrado continua usando Base44; não há integração operacional Supabase de perfil demonstrada pela busca em `src`. Documentos antigos ainda sugerem UPDATE direto e precisam ser ajustados junto com o contrato final. A migração integral do frontend não foi iniciada.

## Execução neste checkpoint

- Executados: inspeção de migrations e consumidores, comparação do histórico remoto, consultas locais de privilégios, RLS, view e buckets. Consultas locais concluíram sem erro.
- Não executados: suíte funcional positiva/negativa, `migration up`, `db reset`, `db push`. Nenhuma migration nova foi criada ou aplicada; o checkpoint não representa validação completa.
- A alteração preexistente em `supabase/snippets/Untitled query 296.sql` foi preservada e não integra o commit da auditoria.

## Retomada

Após definir a privacidade da mídia: concluir auditoria; criar novas migrations sem editar o histórico; fechar escrita direta e acesso a colunas privadas; atualizar o contrato dos RPCs; testar dono/amigo/estranho/anon, onboarding, validações, badges e Storage; iterar com `npx supabase migration up`; reconstruir com `npx supabase db reset` e repetir a suíte; somente então executar `npx supabase db push` e publicar blocos coerentes no GitHub.
