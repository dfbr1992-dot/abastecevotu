ALTER TABLE pontos_codigos ADD CONSTRAINT pontos_codigos_codigo_6digitos CHECK (codigo ~ '^[0-9]{6}$');
CREATE UNIQUE INDEX pontos_codigos_codigo_pendente_idx ON pontos_codigos (codigo) WHERE status = 'pendente';

CREATE OR REPLACE VIEW saldo_pontos_por_posto AS
SELECT user_id, posto_id,
  COALESCE(SUM(CASE WHEN tipo = 'credito' THEN quantidade ELSE -quantidade END), 0) AS saldo
FROM pontos_transacoes GROUP BY user_id, posto_id;
COMMENT ON VIEW saldo_pontos_por_posto IS 'Saldo de pontos por usuário e posto, derivado do ledger';

ALTER TABLE pontos_transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pontos_codigos ENABLE ROW LEVEL SECURITY;
