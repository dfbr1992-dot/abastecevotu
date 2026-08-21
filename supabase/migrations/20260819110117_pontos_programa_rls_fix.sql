DROP POLICY IF EXISTS pontos_transacoes_write_service_role ON pontos_transacoes;
DROP POLICY IF EXISTS pontos_transacoes_delete_none ON pontos_transacoes;
DROP POLICY IF EXISTS pontos_codigos_update_service_role ON pontos_codigos;
DROP POLICY IF EXISTS pontos_codigos_delete_none ON pontos_codigos;
DROP POLICY IF EXISTS pontos_transacoes_select_own ON pontos_transacoes;
DROP POLICY IF EXISTS pontos_codigos_select_own ON pontos_codigos;
DROP POLICY IF EXISTS pontos_codigos_insert_pending ON pontos_codigos;

CREATE POLICY pontos_transacoes_select_own ON pontos_transacoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY pontos_codigos_select_own ON pontos_codigos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY pontos_codigos_insert_pending ON pontos_codigos FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pendente' AND usado_em IS NULL AND usado_por IS NULL);
