-- ════════════════════════════════════════════════════════
-- Gamificação — Fase 2: conquistas
-- Rodar uma vez no SQL Editor do Supabase. É seguro rodar de novo.
-- As tabelas achievements e user_achievements já foram criadas na migration 001;
-- aqui entra só a view com as contagens usadas para desbloquear conquistas.
-- Enquanto esta migration não for aplicada, o sistema funciona normalmente, sem conquistas.
-- ════════════════════════════════════════════════════════

-- Conta, por usuário, quantas origens de cada tipo estão com XP positivo no ledger.
-- Ex.: uma tarefa concluída e depois desfeita tem saldo zero e não conta.
create or replace view public.xp_user_stats
with (security_invoker = true) as
select
  user_id,
  (count(*) filter (where kind = 'task'))::integer as tasks_completed,
  (count(*) filter (where kind = 'routine'))::integer as routines_completed,
  (count(*) filter (where kind = 'checkout'))::integer as checkouts,
  (count(*) filter (where kind = 'perfect_day'))::integer as perfect_days
from (
  select user_id, day, source_id, split_part(source_id, ':', 1) as kind
  from public.xp_events
  where day is not null and source_id is not null
  group by user_id, day, source_id
  having sum(amount) > 0
) paid
group by user_id;

revoke all on public.xp_user_stats from anon;
