
-- Premium flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- Allow owner to insert their own profile (trigger uses SECURITY DEFINER but keep safe)
DROP POLICY IF EXISTS "Profiles insert by owner" ON public.profiles;
CREATE POLICY "Profiles insert by owner" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Profiles update by owner" ON public.profiles;
CREATE POLICY "Profiles update by owner" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  marca text NOT NULL,
  modelo text NOT NULL,
  ano integer,
  placa text,
  licenciamento_vencimento date,
  seguro_vencimento date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles owner select" ON public.vehicles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "vehicles owner insert" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vehicles owner update" ON public.vehicles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vehicles owner delete" ON public.vehicles FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Points ledger
CREATE TABLE IF NOT EXISTS public.points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta integer NOT NULL,
  descricao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger owner select" ON public.points_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ledger owner insert" ON public.points_ledger FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON public.points_ledger(user_id, created_at DESC);

-- Rewards
CREATE TABLE IF NOT EXISTS public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  custo_pontos integer NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  emoji text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rewards public read" ON public.rewards FOR SELECT TO public USING (true);
CREATE POLICY "rewards admin manage" ON public.rewards FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Redemptions
CREATE TABLE IF NOT EXISTS public.redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_id uuid NOT NULL REFERENCES public.rewards(id) ON DELETE RESTRICT,
  codigo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redemptions owner select" ON public.redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "redemptions owner insert" ON public.redemptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "redemptions admin select" ON public.redemptions FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

-- Seed rewards
INSERT INTO public.rewards (nome, descricao, custo_pontos, emoji) VALUES
('Café Expresso', 'Cortesia em postos parceiros', 100, '☕'),
('Pão de Queijo', 'Unidade tradicional', 150, '🧀'),
('Refrigerante 350ml', 'Lata gelada', 200, '🥤'),
('Sanduíche Natural', 'Frango ou atum', 350, '🥪'),
('Troca de Óleo (50% OFF)', 'Cupom em parceiros selecionados', 800, '🛢️'),
('Lavagem Completa', 'Cortesia em lava-rápido parceiro', 1200, '🚿')
ON CONFLICT DO NOTHING;
