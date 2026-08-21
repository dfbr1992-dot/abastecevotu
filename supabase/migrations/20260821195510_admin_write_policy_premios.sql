-- Permite que admins (has_role) gerenciem o catálogo de prêmios por posto.
-- A policy de leitura existente ("Qualquer usuário logado pode ler premios") não é alterada.
CREATE POLICY "Admins gerenciam premios" ON public.premios
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
