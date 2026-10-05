-- ════════════════════════════════════════════════════════
-- Gamificação — Fase 1 (XP, níveis, sequência)
-- Rodar uma vez no SQL Editor do Supabase. É seguro rodar de novo.
-- Não altera nem apaga nenhum dado existente.
-- ════════════════════════════════════════════════════════

-- ── 1. Data de conclusão das tarefas, gravada pelo banco ──────────────
-- O cliente não consegue forjar: o trigger sobrescreve o que vier.
alter table public.tasks add column if not exists completed_at timestamptz;

create or replace function public.gamification_stamp_task()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.completed_at := case when new.status = 'Concluída' then now() else null end;
  else
    new.created_at := old.created_at;
    if new.status = 'Concluída' then
      new.completed_at := case
        when old.status is distinct from 'Concluída' then now()
        else old.completed_at
      end;
    else
      new.completed_at := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists gamification_stamp_task on public.tasks;
create trigger gamification_stamp_task
  before insert or update on public.tasks
  for each row execute function public.gamification_stamp_task();

-- ── 2. Ledger de XP (livro-razão imutável) ────────────────────────────
create table if not exists public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  amount integer not null,
  source_id text,
  day date,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists xp_events_user_day_idx on public.xp_events (user_id, day);
create index if not exists xp_events_user_created_idx on public.xp_events (user_id, created_at desc);

-- ── 3. Projeção do progresso (recalculável a partir do ledger) ────────
create table if not exists public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_xp integer not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  streak_shields integer not null default 0,
  last_active_day date,
  updated_at timestamptz not null default now()
);

-- ── 4. Parâmetros ajustáveis (sobrescrevem os padrões do código) ──────
-- Ex.: update gamification_config set params = '{"bonus":{"dailyCheckout":25}}' where id = 1;
create table if not exists public.gamification_config (
  id integer primary key default 1 check (id = 1),
  params jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.gamification_config (id) values (1) on conflict (id) do nothing;

-- ── 5. Totais por dia (usados para XP total e sequência) ──────────────
create or replace view public.xp_day_totals
with (security_invoker = true) as
select
  user_id,
  day,
  sum(amount)::integer as total_xp,
  coalesce(sum(amount) filter (
    where type in ('TASK_COMPLETED', 'TASK_REVERTED', 'ROUTINE_COMPLETED', 'ROUTINE_REVERTED')
  ), 0)::integer as activity_xp
from public.xp_events
group by user_id, day;

-- ── 6. Estruturas das próximas fases (ainda sem uso) ──────────────────
create table if not exists public.achievements (
  id text primary key,
  title text not null,
  description text not null default '',
  xp_reward integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.avatar_items (
  id text primary key,
  slot text not null,
  title text not null,
  min_level integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.user_avatar (
  user_id uuid primary key references auth.users (id) on delete cascade,
  equipped jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── 7. Segurança ──────────────────────────────────────────────────────
-- Só há políticas de LEITURA. Sem política de escrita, o cliente não insere,
-- altera nem apaga XP; apenas o servidor (service role) escreve.
alter table public.xp_events enable row level security;
alter table public.user_progress enable row level security;
alter table public.gamification_config enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.avatar_items enable row level security;
alter table public.user_avatar enable row level security;

drop policy if exists "Usuário lê o próprio XP" on public.xp_events;
create policy "Usuário lê o próprio XP" on public.xp_events
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Equipe lê progresso" on public.user_progress;
create policy "Equipe lê progresso" on public.user_progress
  for select to authenticated using (true);

drop policy if exists "Equipe lê configuração" on public.gamification_config;
create policy "Equipe lê configuração" on public.gamification_config
  for select to authenticated using (true);

drop policy if exists "Equipe lê conquistas" on public.achievements;
create policy "Equipe lê conquistas" on public.achievements
  for select to authenticated using (true);

drop policy if exists "Equipe lê conquistas dos membros" on public.user_achievements;
create policy "Equipe lê conquistas dos membros" on public.user_achievements
  for select to authenticated using (true);

drop policy if exists "Equipe lê itens de avatar" on public.avatar_items;
create policy "Equipe lê itens de avatar" on public.avatar_items
  for select to authenticated using (true);

drop policy if exists "Equipe lê avatares" on public.user_avatar;
create policy "Equipe lê avatares" on public.user_avatar
  for select to authenticated using (true);

-- Usuário sem login não enxerga nada da gamificação
revoke all on public.xp_events, public.user_progress, public.gamification_config,
  public.achievements, public.user_achievements, public.avatar_items, public.user_avatar,
  public.xp_day_totals from anon;

-- Usuário logado só lê; qualquer escrita fica restrita ao servidor
revoke insert, update, delete, truncate on public.xp_events, public.user_progress,
  public.gamification_config, public.achievements, public.user_achievements,
  public.avatar_items, public.user_avatar from authenticated;
