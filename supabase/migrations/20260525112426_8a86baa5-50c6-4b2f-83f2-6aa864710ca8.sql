
-- 1. Remove the overly-permissive INSERT policies
DROP POLICY IF EXISTS "ledger owner insert" ON public.points_ledger;
DROP POLICY IF EXISTS "redemptions owner insert" ON public.redemptions;

-- 2. Server-side controlled point awards
CREATE OR REPLACE FUNCTION public.award_points_for_action(_action text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _delta integer;
  _desc text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  CASE _action
    WHEN 'confirm_price' THEN _delta := 5; _desc := 'Avaliou posto';
    ELSE RAISE EXCEPTION 'unknown action';
  END CASE;

  -- Throttle: at most one award of this action per user per 5 minutes
  IF EXISTS (
    SELECT 1 FROM public.points_ledger
    WHERE user_id = _uid
      AND descricao = _desc
      AND created_at > now() - interval '5 minutes'
  ) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.points_ledger (user_id, delta, descricao)
  VALUES (_uid, _delta, _desc);

  RETURN _delta;
END;
$$;

REVOKE ALL ON FUNCTION public.award_points_for_action(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.award_points_for_action(text) TO authenticated;

-- 3. Atomic reward redemption (validates premium + balance, debits points, creates redemption)
CREATE OR REPLACE FUNCTION public.redeem_reward(_reward_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_premium boolean;
  _cost integer;
  _name text;
  _balance integer;
  _code text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT is_premium INTO _is_premium FROM public.profiles WHERE id = _uid;
  IF NOT COALESCE(_is_premium, false) THEN
    RAISE EXCEPTION 'premium required';
  END IF;

  SELECT custo_pontos, nome INTO _cost, _name
  FROM public.rewards WHERE id = _reward_id AND ativo = true;
  IF _cost IS NULL THEN
    RAISE EXCEPTION 'reward not found';
  END IF;

  SELECT COALESCE(SUM(delta), 0) INTO _balance
  FROM public.points_ledger WHERE user_id = _uid;

  IF _balance < _cost THEN
    RAISE EXCEPTION 'insufficient points';
  END IF;

  _code := 'VOTU-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.points_ledger (user_id, delta, descricao)
  VALUES (_uid, -_cost, 'Resgate — ' || _name);

  INSERT INTO public.redemptions (user_id, reward_id, codigo)
  VALUES (_uid, _reward_id, _code);

  RETURN _code;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_reward(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid) TO authenticated;
