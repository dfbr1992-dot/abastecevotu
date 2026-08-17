-- =============================================================================
-- Adoção de inscrição push anônima no login
-- Client chama esta RPC após autenticar, passando o device_id salvo em
-- localStorage. A função localiza a linha anônima pelo device_id e a vincula ao
-- usuário autenticado (UPDATE, nunca duplica linhas).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.adopt_push_subscription(_device_id text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_target_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _device_id IS NULL OR _device_id = '' THEN
    RAISE EXCEPTION 'invalid_device_id';
  END IF;

  SELECT s.id INTO v_target_id
  FROM public.user_subscriptions s
  WHERE s.device_id = _device_id
    AND s.user_id IS NULL
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_target_id IS NULL THEN
    -- Sem inscrição anônima para adotar; registra nova linha para o usuário.
    INSERT INTO public.user_subscriptions (user_id, device_id)
    VALUES (v_user_id, _device_id)
    ON CONFLICT (device_id) DO NOTHING;
    RETURN;
  END IF;

  -- Vincula a inscrição anônima existente ao usuário autenticado.
  UPDATE public.user_subscriptions
  SET user_id = v_user_id
  WHERE id = v_target_id
    AND user_id IS NULL
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.adopt_push_subscription(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.adopt_push_subscription(text) TO authenticated;
