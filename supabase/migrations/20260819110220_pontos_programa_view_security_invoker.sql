CREATE OR REPLACE VIEW saldo_pontos_por_posto WITH (security_invoker = true) AS
SELECT user_id, posto_id,
  COALESCE(SUM(CASE WHEN tipo = 'credito' THEN quantidade ELSE -quantidade END), 0) AS saldo
FROM pontos_transacoes GROUP BY user_id, posto_id;
COMMENT ON VIEW saldo_pontos_por_posto IS 'Saldo de pontos por usuário e posto, derivado do ledger';

GRANT SELECT ON saldo_pontos_por_posto TO anon, authenticated, service_role;
