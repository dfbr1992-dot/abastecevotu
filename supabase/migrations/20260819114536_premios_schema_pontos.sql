ALTER TABLE premios ADD COLUMN IF NOT EXISTS posto_id uuid REFERENCES postos(id);
ALTER TABLE premios ADD COLUMN IF NOT EXISTS custo_pontos integer;
ALTER TABLE premios ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
COMMENT ON TABLE premios IS 'Catálogo de prêmios resgatáveis por pontos, por posto';
GRANT SELECT ON premios TO anon, authenticated, service_role;
