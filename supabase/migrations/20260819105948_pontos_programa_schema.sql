ALTER TABLE postos ADD COLUMN IF NOT EXISTS pontos_por_real numeric(6,2) NOT NULL DEFAULT 1.00;
COMMENT ON COLUMN postos.pontos_por_real IS 'Pontos ganhos por R$1 gasto no posto, configurável pelo posto';

CREATE TABLE IF NOT EXISTS pontos_transacoes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id),
  posto_id    uuid NOT NULL REFERENCES postos(id),
  tipo        text NOT NULL CHECK (tipo IN ('credito','debito')),
  quantidade  integer NOT NULL CHECK (quantidade > 0),
  motivo      text NOT NULL,
  codigo_id   uuid,
  valor_gasto numeric(10,2),
  criado_por  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE pontos_transacoes IS 'Ledger append-only de pontos. Nunca é editado/deletado, só inserido.';

CREATE TABLE IF NOT EXISTS pontos_codigos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles(id),
  posto_id          uuid NOT NULL REFERENCES postos(id),
  tipo              text NOT NULL CHECK (tipo IN ('ganho','resgate')),
  codigo            text NOT NULL,
  premio_id         uuid REFERENCES premios(id),
  quantidade_pontos integer,
  status            text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','usado','expirado','cancelado')),
  expira_em         timestamptz NOT NULL,
  usado_em          timestamptz,
  usado_por         uuid,
  created_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE pontos_codigos IS 'Códigos de troca frentista <-> cliente (ganho no abastecimento e resgate de prêmio)';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'pontos_transacoes_codigo_id_fkey') THEN
    ALTER TABLE pontos_transacoes ADD CONSTRAINT pontos_transacoes_codigo_id_fkey FOREIGN KEY (codigo_id) REFERENCES pontos_codigos(id);
  END IF;
END $$;
