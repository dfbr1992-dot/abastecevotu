-- Fecha a lacuna: revoke anterior não cobriu o grant padrão do Postgres para PUBLIC
revoke execute on function public.legacy_award_points_for_action(text) from public;
revoke execute on function public.legacy_redeem_reward(uuid) from public;
revoke execute on function public.legacy_update_user_points_balance() from public;
