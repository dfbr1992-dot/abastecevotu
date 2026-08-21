-- Aposentar sistema antigo de pontos (global por CPF), confirmado como resíduo de protótipo.
-- Abordagem reversível: revoga acesso, remove trigger, renomeia (não apaga) tabelas/funções.

-- 1. Revogar acesso público às funções expostas via RPC
revoke execute on function public.award_points_for_action(text) from anon, authenticated;
revoke execute on function public.redeem_reward(uuid) from anon, authenticated;
revoke execute on function public.update_user_points_balance() from anon, authenticated;

-- 2. Remover o trigger que mantém profiles.total_points sincronizado
drop trigger if exists on_points_logged on public.points_ledger;

-- 3. Renomear (não apagar) as tabelas legadas
alter table public.points_ledger rename to legacy_points_ledger;
alter table public.rewards rename to legacy_rewards;
alter table public.redemptions rename to legacy_redemptions;

-- 4. Renomear as funções legadas
alter function public.award_points_for_action(text) rename to legacy_award_points_for_action;
alter function public.redeem_reward(uuid) rename to legacy_redeem_reward;
alter function public.update_user_points_balance() rename to legacy_update_user_points_balance;

-- Nota: profiles.total_points NÃO é removida neste commit (fica órfã, sem trigger).
-- Remover essa coluna é mudança em tabela muito referenciada e merece migration própria.
