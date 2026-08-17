-- Database webhooks para alertas admin em tempo real.
-- Os Database Webhooks do Supabase são wrappers de triggers pg_net;
-- criar via SQL faz com que apareçam na página "Integrations > Webhooks" do Dashboard.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  END IF;
END $$;

-- 1) Novo cadastro (profiles INSERT) -> notify-admin-event
DROP TRIGGER IF EXISTS "admin_webhook_profiles_insert" ON public.profiles;
CREATE TRIGGER "admin_webhook_profiles_insert"
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://joinkeaozewabkkyunwu.supabase.co/functions/v1/notify-admin-event',
  'POST',
  '{"Content-Type": "application/json"}',
  '{}',
  '1000'
);

-- 2) Novos assinantes Pro (profiles UPDATE com is_premium true) -> notify-admin-event
DROP TRIGGER IF EXISTS "admin_webhook_profiles_update" ON public.profiles;
CREATE TRIGGER "admin_webhook_profiles_update"
AFTER UPDATE OF is_premium ON public.profiles
FOR EACH ROW
WHEN (NEW.is_premium IS TRUE AND (OLD.is_premium IS DISTINCT FROM NEW.is_premium))
EXECUTE FUNCTION supabase_functions.http_request(
  'https://joinkeaozewabkkyunwu.supabase.co/functions/v1/notify-admin-event',
  'POST',
  '{"Content-Type": "application/json"}',
  '{}',
  '1000'
);
