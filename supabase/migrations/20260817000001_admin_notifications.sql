-- =============================================================================
-- Admin push subscriptions + admin notifications inbox
-- (tabelas sem acesso do cliente; escrita apenas via service_role/Edge Functions)
-- =============================================================================

-- 1) Inscrições push dos próprios admins
CREATE TABLE IF NOT EXISTS public.admin_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (endpoint, p256dh)
);

ALTER TABLE public.admin_push_subscriptions ENABLE ROW LEVEL SECURITY;
-- Sem políticas para anon/authenticated: nada pode ser lido/escrito pelo client.
-- A escrita ocorre exclusivamente pela Edge Function notify-admin-event
-- (registrando a via RPC com service_role) ou diretamente com service_role.

-- 2) Inbox de notificações internas do admin
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('novo_cadastro', 'nova_assinatura')),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read boolean NOT NULL DEFAULT false
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_notifications_admins" ON public.admin_notifications;
CREATE POLICY "admin_notifications_admins" ON public.admin_notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) RPC para o admin registrar sua própria inscrição push (chamado pelo client
--    do admin). Escrita é validada pelo has_role('admin').
CREATE OR REPLACE FUNCTION public.register_admin_push(_endpoint text, _p256dh text, _auth_key text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  INSERT INTO public.admin_push_subscriptions (endpoint, p256dh, auth_key)
  VALUES (_endpoint, _p256dh, _auth_key)
  ON CONFLICT (endpoint, p256dh) DO NOTHING;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.register_admin_push(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.register_admin_push(text, text, text) TO authenticated;

-- 4) Função interna usada pelo webhook de nova assinatura para gravar no inbox.
CREATE OR REPLACE FUNCTION public.insert_admin_notification(_type text, _payload jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, payload)
  VALUES (_type, _payload);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.insert_admin_notification(text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_admin_notification(text, jsonb) TO service_role;
