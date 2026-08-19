-- Corrigir erro 42P03: trigger user_subscriptions_updated_at chamado em INSERT
-- em tabela que não possui mais a coluna updated_at.
-- O trigger só deve rodar em UPDATE, pois a tabela mantém updated_at apenas
-- para manter compatibilidade histórica de nome de função (set_updated_at).
DROP TRIGGER IF EXISTS user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
