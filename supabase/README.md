# Supabase — Zoku

## Estado verificado em 2026-09-15

- Repositório: anizoku/zoku-web; branch main.
- CLI instalado: 2.117.0.
- Projeto vinculado: zoku's Project (`xnggztoykbflirtnznjr`), ca-central-1.
- `supabase projects list` confirmou linked=true e ACTIVE_HEALTHY.
- `supabase migration list` não retornou versões remotas aplicadas. Isso não comprova que o banco esteja vazio.
- Nenhuma migration foi aplicada durante esta preparação.

## Estrutura

- `config.toml`: configuração local existente; project_id não é o identificador remoto.
- `.temp/`: vínculo e cache locais, ignorados pelo Git.
- `migrations/0001_initial_schema.sql`: DDL existente, pendente de revisão e aprovação.
- `rollback/0001_rollback.sql`: script manual destrutivo; nunca executar automaticamente.
- `validation/0001_validation_queries.sql`: consultas de validação para revisão e execução manual.

Somente migrations de avanço devem ficar em `migrations/`. Os scripts auxiliares foram movidos sem alterar seus bytes. A versão inicial 0001 foi preservada; novas migrations devem usar timestamps únicos gerados pelo CLI.

## Fluxo de aprovação

1. Conferir o projeto com `supabase projects list` e o histórico com `supabase migration list`.
2. Revisar o DDL existente, políticas RLS, dependências e o estado real do schema remoto antes de propor aplicação. Esta preparação não valida a correção do SQL.
3. Para preparar um novo arquivo local: `supabase migration new nome_descritivo`.
4. Apresentar o SQL exato, projeto de destino e efeitos esperados ao responsável.
5. Obter aprovação explícita antes de aplicar qualquer migration, inclusive localmente.

Não executar `db push`, `migration up`, `db reset`, rollback ou reparos no histórico sem aprovação. Não há script automático de aplicação nesta estrutura. A exigência de aprovação é operacional, não um bloqueio técnico do CLI.

Referência: https://supabase.com/docs/guides/deployment/database-migrations
