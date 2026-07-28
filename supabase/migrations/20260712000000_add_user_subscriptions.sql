CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  posto_id UUID REFERENCES public.postos(id) ON DELETE CASCADE, -- Opcional: para monitorar postos específicos
  combustivel_tipo public.combustivel_tipo, -- Opcional: para monitorar tipos de combustível específicos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, fcm_token, posto_id, combustivel_tipo) -- Garante que um usuário não tenha múltiplas subscrições idênticas
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver e gerenciar suas próprias subscrições" ON public.user_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
