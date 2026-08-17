-- =============================================================================
-- Push audience segmentation — abastecevotuapp
-- - user_subscriptions: suporte a inscrições anônimas (user_id nullable + device_id)
-- - View usuarios_premium_ativos (não existia; baseada em profiles.is_premium)
-- - View push_audience_segments (service_role only)
-- =============================================================================

-- 1) Tornar user_id nullable e adicionar device_id para inscrições anônimas
ALTER TABLE public.user_subscriptions
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS device_id TEXT;

-- 2) Recriar constraints preservando o fluxo existente.
--    Padrão atual: UNIQUE(user_id, fcm_token, posto_id, combustivel_tipo) com
--    upsert por user_id no client. Como user_id agora pode ser NULL, trocamos por
--    UNIQUE NULLS NOT DISTINCT para manter o comportamento idêntico para usuários
--    logados, e adicionamos unicidade parcial de device_id para anônimos.
DO $$
DECLARE
  c pg_constraint;
BEGIN
  FOR c IN
    SELECT * FROM pg_constraint
    WHERE conrelid = 'public.user_subscriptions'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.user_subscriptions DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_user_sub_key UNIQUE NULLS NOT DISTINCT (user_id, fcm_token, posto_id, combustivel_tipo);

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_anon_device_unique UNIQUE NULLS DISTINCT (device_id)
  WHERE user_id IS NULL;

-- 3) Gatilho updated_at (recriar caso a migration antiga use outro nome)
DROP TRIGGER IF EXISTS user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) RLS: sem escrita do cliente em user_subscriptions — tudo via Edge Functions.
--    O fluxo atual do client (push-service.ts) upsert via publishable key; após o
--    deploy das Edge Functions e do novo client (adoção via RPC), a escrita direta
--    do cliente deve ser desativada. Deixamos políticas de leitura para o app e
--    escrita apenas via função privilegiada.
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- (a) Qualquer pessoa autenticada pode ler a própria inscrição (preserva UX).
DROP POLICY IF EXISTS "Usuários podem ver e gerenciar suas próprias subscrições" ON public.user_subscriptions;
CREATE POLICY "user_subscriptions_owner_select" ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- (b) Escrita do cliente desabilitada: quem quiser permitir pode habilitar via
--     RPC/Edge Function. Se quiser manter a escrita direta do client (legado),
--     recrie a política WITH CHECK (auth.uid() = user_id).

-- 5) View usuarios_premium_ativos — não existia no banco; construída sobre
--    profiles.is_premium com janela de carência (grace period) configurável.
CREATE OR REPLACE VIEW public.usuarios_premium_ativos WITH (security_invoker = false) AS
  SELECT
    p.id AS user_id,
    p.email,
    p.is_premium,
    p.updated_at
  FROM public.profiles p
  WHERE p.is_premium = true;
-- Nota: grace period (ex.: 3 dias após is_premium virar false) pode ser ativado
-- trocando a condição por: (is_premium = true OR (updated_at > now() - interval '3 days')).

-- 6) View push_audience_segments — classificação por segmento (service_role only).
CREATE OR REPLACE VIEW public.push_audience_segments AS
  SELECT
    s.id AS subscription_id,
    s.user_id,
    s.device_id,
    CASE
      WHEN s.user_id IS NULL THEN 'sem_conta'
      WHEN EXISTS (SELECT 1 FROM public.usuarios_premium_ativos a WHERE a.user_id = s.user_id) THEN 'assinante'
      ELSE 'com_conta'
    END AS segmento
  FROM public.user_subscriptions s;

REVOKE ALL ON public.push_audience_segments FROM anon, authenticated;
GRANT SELECT ON public.push_audience_segments TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- 7) Contagem por segmento (helper usado pelo admin para exibir estimativa)
CREATE OR REPLACE FUNCTION public.count_push_segment(_segmento text)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT count(*) FROM public.push_audience_segments WHERE segmento = _segmento
$$;
REVOKE EXECUTE ON FUNCTION public.count_push_segment(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_push_segment(text) TO service_role;
