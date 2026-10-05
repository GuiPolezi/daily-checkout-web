-- ════════════════════════════════════════════════════════
-- Gamificação — índice para as metas da equipe
-- Rodar uma vez no SQL Editor do Supabase. É seguro rodar de novo.
-- Opcional: as metas funcionam sem ele. O índice só evita que a leitura da semana de toda a
-- equipe (feita a cada sincronização) percorra o ledger inteiro quando ele crescer.
-- ════════════════════════════════════════════════════════

create index if not exists xp_events_day_idx on public.xp_events (day) include (user_id);
