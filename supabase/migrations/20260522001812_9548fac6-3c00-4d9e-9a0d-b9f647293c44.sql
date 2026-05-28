
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by owner" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Postos
CREATE TABLE public.postos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  horario_abertura TEXT,
  horario_fechamento TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.postos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER postos_updated_at BEFORE UPDATE ON public.postos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Postos públicos para leitura" ON public.postos FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam postos" ON public.postos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Preços
CREATE TYPE public.combustivel_tipo AS ENUM ('etanol','gasolina_comum','gasolina_aditivada','diesel');

CREATE TABLE public.precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posto_id UUID NOT NULL REFERENCES public.postos(id) ON DELETE CASCADE,
  combustivel combustivel_tipo NOT NULL,
  valor NUMERIC(5,3) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (posto_id, combustivel)
);
ALTER TABLE public.precos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER precos_updated_at BEFORE UPDATE ON public.precos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Preços públicos para leitura" ON public.precos FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam preços" ON public.precos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Serviços
CREATE TYPE public.servico_categoria AS ENUM ('lava_rapido','oficina_mecanica','troca_oleo');

CREATE TABLE public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria servico_categoria NOT NULL,
  endereco TEXT,
  telefone TEXT,
  horario TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER servicos_updated_at BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Serviços públicos para leitura" ON public.servicos FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam serviços" ON public.servicos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Banners
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  prioridade INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banners públicos para leitura" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam banners" ON public.banners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket para banners
INSERT INTO storage.buckets (id, name, public) VALUES ('banners','banners', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Banners públicos para leitura no storage" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Admins fazem upload de banners" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins atualizam banners" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins removem banners" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));
