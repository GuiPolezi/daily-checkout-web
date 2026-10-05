-- ════════════════════════════════════════════════════════
-- Gamificação — personagem: troca de item atômica
-- Rodar uma vez no SQL Editor do Supabase. É seguro rodar de novo.
-- Opcional: sem esta migration a personalização funciona do mesmo jeito; ela só evita que
-- duas trocas feitas ao mesmo tempo (ex.: duas abas abertas) sobrescrevam uma à outra.
-- ════════════════════════════════════════════════════════

-- Altera só o slot informado, preservando os demais.
create or replace function public.gamification_equip_avatar(p_user_id uuid, p_slot text, p_item text)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.user_avatar (user_id, equipped, updated_at)
  values (p_user_id, jsonb_build_object(p_slot, p_item), now())
  on conflict (user_id) do update
    -- Se o valor salvo não for um objeto (dado antigo/inesperado), recomeça de um objeto vazio
    set equipped = (case when jsonb_typeof(public.user_avatar.equipped) = 'object'
                         then public.user_avatar.equipped else '{}'::jsonb end) || excluded.equipped,
        updated_at = now();
$$;

-- Só o servidor (service role) pode chamar; ele valida slot, item e nível antes.
revoke all on function public.gamification_equip_avatar(uuid, text, text) from public, anon, authenticated;
grant execute on function public.gamification_equip_avatar(uuid, text, text) to service_role;
