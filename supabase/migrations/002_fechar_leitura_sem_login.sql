-- ════════════════════════════════════════════════════════
-- Correção de segurança: leitura sem login
-- Hoje qualquer pessoa com a chave pública (que vai no navegador) consegue ler,
-- sem estar logada, os relatórios, os perfis e as estatísticas da equipe.
-- Este script retira o acesso do papel "anon". Usuários logados não mudam em nada.
-- Rodar uma vez no SQL Editor do Supabase. É seguro rodar de novo.
-- ════════════════════════════════════════════════════════

revoke all on public.reports from anon;
revoke all on public.profiles from anon;
revoke all on public.user_task_stats from anon;

-- Estas já estavam protegidas por RLS; a revogação é só uma segunda camada.
revoke all on public.tasks from anon;
revoke all on public.team_tasks from anon;
revoke all on public.team_task_completions from anon;

-- Conferência (opcional): lista o que o papel anon ainda consegue ler em public.
--   select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public' and c.relkind in ('r', 'v')
--     and has_table_privilege('anon', c.oid, 'select');
--
-- Conferência (recomendada): as políticas de tasks, team_task_completions e reports
-- devem exigir auth.uid() = user_id em INSERT/UPDATE/DELETE; sem isso, uma pessoa
-- consegue alterar as tarefas (e portanto o XP) de outra.
--   select tablename, policyname, cmd, roles, qual, with_check
--   from pg_policies where schemaname = 'public' order by tablename, cmd;

-- Para desfazer, se necessário:
--   grant select on public.reports, public.profiles, public.user_task_stats to anon;
