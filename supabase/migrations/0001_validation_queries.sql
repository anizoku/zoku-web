-- ============================================================================
-- AniZoku — Validation Queries (0001)
-- ============================================================================
-- Queries para verificar se o schema foi criado corretamente.
-- Executar APÓS aplicar 0001_initial_schema.sql.
-- NÃO executa nenhuma modificação — apenas leitura/verificação.
-- ============================================================================

-- ============================================================================
-- 1. TABELAS CRIADAS
-- ============================================================================
-- Verificar se todas as 34 tabelas foram criadas
SELECT tablename AS table_name
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'dynamic_works', 'work_releases', 'external_mappings', 'catalog_sync',
    'card_overrides', 'work_category_visibility', 'media_works',
    'user_profiles', 'anime_entries', 'achievements', 'user_achievements',
    'xp_events',
    'sync_runs', 'sync_logs', 'sync_conflicts',
    'friendships', 'posts', 'comments', 'communities', 'social_events',
    'event_comments', 'watch_togethers', 'direct_messages', 'notifications',
    'activity_feed', 'debates',
    'news', 'fan_art', 'platform_banners', 'login_background_images',
    'site_config', 'work_suggestions', 'content_reports',
    'user_roles', 'id_mapping', 'url_mapping'
  )
ORDER BY tablename;

-- Contar tabelas (esperado: 34)
SELECT count(*) AS total_tables
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'schema_%';

-- ============================================================================
-- 2. TIPOS DAS PKs (esperado: TEXT para entidades migradas, UUID para user_roles)
-- ============================================================================
SELECT
  c.relname AS table_name,
  a.attname AS pk_column,
  format_type(a.atttypid, a.atttypmod) AS pk_type
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
JOIN pg_class c ON c.oid = i.indrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE i.indisprimary
  AND n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

-- Verificar especificamente que IDs são TEXT (não UUID) nas entidades migradas
SELECT c.relname, a.attname, format_type(a.atttypid, a.atttypmod) AS type
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
JOIN pg_class c ON c.oid = i.indrelid
WHERE i.indisprimary
  AND c.relname IN ('dynamic_works', 'work_releases', 'external_mappings',
    'anime_entries', 'user_profiles', 'sync_runs', 'sync_logs', 'posts', 'comments')
  AND format_type(a.atttypid, a.atttypmod) != 'text';
-- Esperado: 0 linhas. Se retornar linhas, há IDs incorretamente tipados como UUID.

-- ============================================================================
-- 3. FOREIGN KEYS
-- ============================================================================
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f'
  AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;

-- Contar FKs (esperado: 25)
SELECT count(*) AS total_fks
FROM pg_constraint
WHERE contype = 'f'
  AND connamespace = 'public'::regnamespace;

-- Verificar tipos das FKs (TEXT entre entidades, UUID para auth.users)
SELECT
  conname,
  conrelid::regclass::text AS table_name,
  a.attname AS column_name,
  format_type(a.atttypid, a.atttypmod) AS column_type,
  confrelid::regclass::text AS references_table
FROM pg_constraint con
JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
WHERE con.contype = 'f'
  AND con.connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;

-- ============================================================================
-- 4. ÍNDICES
-- ============================================================================
SELECT
  indexname AS index_name,
  tablename AS table_name,
  indexdef AS definition
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
  AND indexname NOT LIKE '%_key'
ORDER BY tablename, indexname;

-- Contar índices não-PK (esperado: ~48)
SELECT count(*) AS total_indices
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey';

-- ============================================================================
-- 5. RLS HABILITADA
-- ============================================================================
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled
FROM pg_class
WHERE relkind = 'r'
  AND relnamespace = 'public'::regnamespace
  AND relname NOT LIKE 'pg_%'
  AND relname NOT LIKE 'schema_%'
ORDER BY relname;
-- Esperado: todas as tabelas com relrowsecurity = true

-- Verificar se alguma tabela NÃO tem RLS habilitada
SELECT relname
FROM pg_class
WHERE relkind = 'r'
  AND relnamespace = 'public'::regnamespace
  AND relrowsecurity = false
  AND relname NOT LIKE 'pg_%'
  AND relname NOT LIKE 'schema_%';
-- Esperado: 0 linhas

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  cmd AS command,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Contar policies por tabela
SELECT tablename, count(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Contar total de policies (esperado: ~80)
SELECT count(*) AS total_policies
FROM pg_policies
WHERE schemaname = 'public';

-- ============================================================================
-- 7. CONSTRAINTS (UNIQUE, CHECK, etc.)
-- ============================================================================
SELECT
  conname AS constraint_name,
  conrelid::regclass::text AS table_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND contype IN ('u', 'c')
ORDER BY conrelid::regclass::text, contype, conname;

-- ============================================================================
-- 8. VERIFICAÇÃO CRÍTICA: UNIQUE em dynamic_works.slug
-- ============================================================================
-- NÃO deve existir UNIQUE constraint em dynamic_works.slug
SELECT conname, conrelid::regclass::text AS table_name, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'u'
  AND conrelid = 'dynamic_works'::regclass
  AND pg_get_constraintdef(oid) ILIKE '%slug%';
-- Esperado: 0 linhas. Se retornar, remover o constraint (quebra importação).

-- ============================================================================
-- 9. VERIFICAÇÃO CRÍTICA: UNIQUE em work_releases.slug
-- ============================================================================
-- DEVE existir UNIQUE constraint em work_releases.slug
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'u'
  AND conrelid = 'work_releases'::regclass
  AND pg_get_constraintdef(oid) ILIKE '%slug%';
-- Esperado: 1 linha (uq_wr_slug)

-- ============================================================================
-- 10. VERIFICAÇÃO CRÍTICA: UNIQUE em external_mappings (provider, provider_id)
-- ============================================================================
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'u'
  AND conrelid = 'external_mappings'::regclass
  AND pg_get_constraintdef(oid) ILIKE '%provider%';
-- Esperado: 1 linha (uq_em_provider)

-- ============================================================================
-- 11. VERIFICAÇÃO: FKs com tipo incompatível
-- ============================================================================
-- Verificar se alguma FK aponta para tipo incompatível (TEXT → UUID ou vice-versa)
SELECT
  conname,
  conrelid::regclass::text AS child_table,
  a.attname AS child_column,
  format_type(a.atttypid, a.atttypmod) AS child_type,
  confrelid::regclass::text AS parent_table,
  af.attname AS parent_column,
  format_type(af.atttypid, af.atttypmod) AS parent_type,
  CASE
    WHEN format_type(a.atttypid, a.atttypmod) != format_type(af.atttypid, af.atttypmod)
    THEN 'TYPE_MISMATCH'
    ELSE 'OK'
  END AS status
FROM pg_constraint con
JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
JOIN pg_attribute af ON af.attrelid = con.confrelid AND af.attnum = con.confkey[1]
WHERE con.contype = 'f'
  AND con.connamespace = 'public'::regnamespace
ORDER BY status DESC, conrelid::regclass::text;
-- Esperado: todas as linhas com status = OK

-- ============================================================================
-- 12. VERIFICAÇÃO: NOT NULL que pode quebrar importação
-- ============================================================================
-- Listar todas as colunas NOT NULL (exceto PKs)
SELECT
  c.relname AS table_name,
  a.attname AS column_name,
  format_type(a.atttypid, a.atttypmod) AS data_type,
  a.attnotnull AS is_not_null
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND a.attnum > 0
  AND NOT a.attisdropped
  AND a.attnotnull = true
  AND a.attname != 'id'
  AND a.attname NOT IN ('created_date', 'updated_date')
  AND c.relname IN (
    'dynamic_works', 'work_releases', 'external_mappings', 'anime_entries',
    'user_profiles', 'sync_runs', 'sync_logs', 'posts', 'comments',
    'communities', 'social_events', 'direct_messages', 'notifications',
    'friendships', 'watch_togethers', 'activity_feed', 'news'
  )
ORDER BY c.relname, a.attname;
-- Esperado: 0 linhas (todas as colunas não-PK são nullable para compatibilidade de importação)

-- ============================================================================
-- 13. VERIFICAÇÃO: CASCADE arriscado
-- ============================================================================
-- Listar FKs com CASCADE (verificar se são apropriadas)
SELECT
  conname,
  conrelid::regclass::text AS child_table,
  confrelid::regclass::text AS parent_table,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f'
  AND connamespace = 'public'::regnamespace
  AND pg_get_constraintdef(oid) ILIKE '%CASCADE%'
ORDER BY conrelid::regclass::text;
-- Esperado: apenas fk_wr_group, fk_sl_run, fk_c_post, fk_c_parent, fk_ec_event
-- (CASCADE apropriado para parent→child diretos)

-- ============================================================================
-- 14. VERIFICAÇÃO: ENUMs criados
-- ============================================================================
SELECT typname AS enum_name
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typtype = 'e'
  AND n.nspname = 'public'
ORDER BY typname;
-- Esperado: 24 ENUMs

-- ============================================================================
-- 15. VERIFICAÇÃO: Triggers de updated_date
-- ============================================================================
SELECT
  event_object_table AS table_name,
  trigger_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'trg_%_updated'
ORDER BY event_object_table;
-- Esperado: 33 triggers

-- ============================================================================
-- 16. VERIFICAÇÃO: Helper functions
-- ============================================================================
SELECT proname AS function_name
FROM pg_proc
WHERE proname IN ('is_admin', 'is_owner', 'current_user_email', 'set_updated_date')
  AND pronamespace = 'public'::regnamespace;
-- Esperado: 4 funções

-- ============================================================================
-- 17. VERIFICAÇÃO: Tabelas auxiliares
-- ============================================================================
SELECT * FROM user_roles; -- deve estar vazia (nenhum usuário criado ainda)
SELECT * FROM id_mapping; -- deve estar vazia
SELECT * FROM url_mapping; -- deve estar vazia

-- ============================================================================
-- 18. RESUMO FINAL
-- ============================================================================
-- Executar todas as queries acima e verificar:
-- 1. 34 tabelas criadas
-- 2. Todas as PKs de entidades migradas são TEXT (não UUID)
-- 3. 25 FKs criadas, todas com tipos compatíveis
-- 4. ~48 índices criados
-- 5. RLS habilitada em todas as tabelas
-- 6. ~80 RLS policies criadas
-- 7. UNIQUE(work_releases.slug) existe
-- 8. UNIQUE(dynamic_works.slug) NÃO existe
-- 9. UNIQUE(external_mappings provider, provider_id) existe
-- 10. Nenhuma coluna NOT NULL que possa quebrar importação (exceto PKs)
-- 11. CASCADE apenas em parent→child diretos (5 FKs)
-- 12. 24 ENUMs criados
-- 13. 33 triggers de updated_date criados
-- 14. 4 helper functions criadas
-- 15. Tabelas auxiliares vazias (user_roles, id_mapping, url_mapping)
-- ============================================================================