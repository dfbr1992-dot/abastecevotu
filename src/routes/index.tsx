import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { InstallButton } from "@/components/InstallButton";
import logoBranca from "@/abastece.png";
import logoPreta from "@/abastece2.png";
import { AdCarousel } from "@/components/AdCarousel";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useAuth } from "@/hooks/use-auth";
import { usePoints } from "@/hooks/use-points";
import { useVehicle, daysUntil } from "@/hooks/use-vehicle";
import { useRewards, usePremium, type Reward } from "@/hooks/use-rewards";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import {
  LogOut,
  Home,
  Car,
  Wrench,
  Gift,
  AlertTriangle,
  Crown,
  Sparkles,
  Lock,
  CheckCircle2,
  Loader2,
  LogIn,
  Sun,
  Moon,
  Star,
  User,
  TrendingUp,
  MapPin,
  Camera,
  Users,
  Share2,
  History,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Abastece Votu — Combustível Mais Barato em Votuporanga" },
      {
        name: "description",
        content:
          "Compare preços de combustível em tempo real, agende serviços e ganhe prêmios com o abastece+ em Votuporanga.",
      },
    ],
  }),
});

type Section = "home" | "postos" | "carro" | "servicos" | "plus";
type Fuel = "etanol" | "gasolina" | "diesel";
type SortBy = "price" | "distance";

type Produto = { name: string; price: string };

type Posto = {
  name: string;
  address: string;
  hours: string;
  prices: Record<Fuel, number>;
  distance: number;
  verifiedBy: number;
  produtos: Produto[];
};

const convPadrao: Produto[] = [
  { name: "Café Expresso", price: "R$ 4,50" },
  { name: "Água Mineral 500ml", price: "R$ 3,00" },
  { name: "Pão de Queijo", price: "R$ 5,00" },
  { name: "Salgado Assado", price: "R$ 7,50" },
  { name: "Refrigerante Lata", price: "R$ 6,00" },
  { name: "Chocolate", price: "R$ 4,00" },
];

const fmt = (n: number) => n.toFixed(2).replace(".", ",");

type Servico = {
  name: string;
  address?: string;
  hours?: string;
  price: string;
  categoria: string;
  distance: number;
  destaque?: boolean;
  ordem?: number;
  whatsapp?: string;
};

function Index() {
  // 1. ESTADOS PRINCIPAIS
  const [postos, setPostos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dadosServicos, setDadosServicos] = useState<Servico[]>([]);
  const { user, displayName, initials, signOut, loading: authLoading } = useAuth(); 
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const navigate = useNavigate();

  // Função de agendamento unificada e trazida para dentro do componente
  const agendarViaWhatsApp = (servico: Servico) => {
    const numero = servico.whatsapp || "5517900000000"; 
    const texto = `Olá! Vi o serviço de *${servico.name}* no App Abastece Votu e gostaria de agendar.`;
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  // 2. BUSCA DE DADOS DO BANCO
  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('postos').select('*, precos(*)').eq('ativo', true);
      if (data) {
        const formatted = data.map(p => ({
          ...p,
          name: p.nome,
          address: p.endereco,
          hours: `${p.horario_abertura} — ${p.horario_fechamento}`,
          prices: {
            etanol: p.precos?.find((pr: any) => pr.combustivel === 'etanol')?.valor || 0,
            gasolina: p.precos?.find((pr: any) => pr.combustivel === 'gasolina_comum')?.valor || 0,
            diesel: p.precos?.find((pr: any) => pr.combustivel === 'diesel')?.valor || 0
          }
        }));
        setPostos(formatted);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    async function buscarServicos() {
      const { data, error } = await supabase
  .from("servicos")
  .select("nome, nome_servico, endereco, horario, preco, categoria")
        .eq('ativo', true);

      if (data) {
        // Mapeamos os dados que vieram do banco para o formato que seu componente espera
        const formatados = data.map(s => ({
  name: s.nome_servico,
  empresa_nome: s.nome, // 🌟 Alterado aqui: puxa a coluna correta do banco!
  address: s.endereco,
  hours: s.horario,
  price: s.preco,
  categoria: s.categoria
}));
        setDadosServicos(formatados as Servico[]);
      }
      
      if (error) {
        console.error("Erro ao buscar serviços:", error);
      }
      setLoading(false);
    }

    buscarServicos();
  }, []);

  // Lista ordenada de serviços usando useMemo para performance
  const servicosOrdenados = useMemo(() => {
    return [...dadosServicos].sort((a, b) => {
      if (a.destaque && !b.destaque) return -1;
      if (!a.destaque && b.destaque) return 1;
      return (b.ordem || 0) - (a.ordem || 0);
    });
  }, [dadosServicos]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  };

  // 3. OUTROS ESTADOS E HOOKS
  const userId = user?.id ?? null;
  const [section, setSection] = useState<Section>("home");
  const [showPointsPanel, setShowPointsPanel] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [fuel, setFuel] = useState<Fuel>("etanol");
  const [sortBy, setSortBy] = useState<SortBy>("price");
  const [confirmed, setConfirmed] = useLocalStorage<string[]>("abastece_confirmed_today", []);
  const [showSplash, setShowSplash] = useState(true);

  const { entries, balance, refresh: refreshPoints, awardForAction } = usePoints(userId);
  const { isPremium, setIsPremium } = usePremium(userId);

  const handleAbasteceMaisClick = () => {
    if (user && isPremium) {
      setSection("plus"); 
    } else {
      setSection("planos"); 
    }
  };

  // Controle de Splash Screen Premium ajustado
  useEffect(() => {
    if (!loading && !authLoading) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, authLoading]);

  // Prevenção de quebra caso os postos ainda estejam vazios
  const sortedPostos = useMemo(() => {
    if (postos.length === 0) return [];
    const copy = [...postos];
    copy.sort((a, b) => (sortBy === "price" ? (a.prices?.[fuel] || 0) - (b.prices?.[fuel] || 0) : (a.distance || 0) - (b.distance || 0)));
    return copy;
  }, [fuel, sortBy, postos]);

  const cheapest = useMemo(() => {
    if (postos.length === 0) return null;
    return [...postos].sort((a, b) => (a.prices?.etanol || 0) - (b.prices?.etanol || 0))[0];
  }, [postos]);

  // 4. TELA DE CARREGAMENTO (Unificada com o Splash)
  if (loading || authLoading || showSplash) {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center bg-[#0B0F19] p-4 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="relative p-4">
           <img 
              src={logoBranca} 
              alt="Abastece Votu Logo" 
              className="h-20 w-auto object-contain select-none"
            />
          </div>
          <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary/70" />
        </div>
      </div>
    );
  }

  const fireToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const requireAuth = (action: () => void, msg = "Faça login para continuar") => {
    if (!user) {
      fireToast(msg);
      setTimeout(() => navigate({ to: "/login", search: { redirect: "/" } }), 700);
      return;
    }
    action();
  };

  const goTo = (s: Section, requireLogin = false) => {
    if (requireLogin) requireAuth(() => setSection(s));
    else setSection(s);
  };

  return (
  <main className={`flex min-h-[100dvh] items-stretch justify-center sm:items-center sm:p-4 transition-colors duration-200 ${
    theme === "dark" ? "bg-[#0f111a] text-white" : "bg-zinc-100 text-zinc-900"
  }`}>
    <InstallButton />
    <div className={`relative flex h-[100dvh] w-full flex-col overflow-hidden sm:h-[860px] transition-colors duration-200 shadow-2xl ${
      theme === "dark" ? "bg-[#0b0f19]" : "bg-white"
    }`}>
      {/* Toast */}

        {/* App bar */}
        <header className={`relative z-20 flex items-center justify-between border-b px-4 py-3 transition-colors duration-200 ${
  theme === "dark" 
    ? "border-white/5 bg-[#121214]/80 backdrop-blur-md" 
    : "border-zinc-200 bg-white/95 backdrop-blur-md shadow-sm"
}`}>
          <div className="flex items-center gap-2.5">
            <img
              src={theme === "dark" ? `${logoBranca}?v=1` : `${logoPreta}?v=2`}
              alt="Abastece Votu — Seu melhor preço, sempre"
              className="h-9 w-auto object-contain"
            />
          </div>
          {user ? (
            <div className="flex items-center gap-2">
              {isPremium && (
                <button
  onClick={handleAbasteceMaisClick}
  className="flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 transition-all hover:bg-yellow-500/20"
>
  <Crown className="h-3.5 w-3.5 text-yellow-500" />
  <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-500">
    abastece+
  </span>
</button>
              )}
              <DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className={`flex items-center gap-2 rounded-full border px-1 py-1 pr-3 transition-all ${theme === "dark" ? "border-white/10 bg-[#161618] hover:bg-white/5" : "border-zinc-200 bg-zinc-100 hover:bg-zinc-200/80"}`}>
      {/* Círculo com a Letra Inicial */}
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-bold text-emerald-500">
        {displayName ? displayName.charAt(0).toUpperCase() : "U"}
      </span>
      {/* Nome do usuário */}
      <span className={`max-w-[100px] truncate text-[12px] font-bold ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
        {displayName?.split(" ")[0] || "Perfil"}
      </span>
    </button>
  </DropdownMenuTrigger>
  
  {/* O container agora muda de cor baseado no tema selecionado */}
 <DropdownMenuContent 
  align="end" 
  className={`w-54 rounded-[20px] shadow-xl p-2 transition-colors duration-200 border ${
    theme === "dark" 
      ? "bg-[#161618] border-white/10 text-white" 
      : "bg-white border-zinc-200 text-zinc-900"
  }`}
>
  <DropdownMenuLabel className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1.5 ${theme === "dark" ? "text-muted-foreground" : "text-zinc-400"}`}>
    Minha Conta
  </DropdownMenuLabel>
  
  <DropdownMenuSeparator className={theme === "dark" ? "bg-white/10 my-1" : "bg-zinc-100 my-1"} />
  
  {/* Opção de Configurações */}
  <DropdownMenuItem 
    onClick={() => navigate({ to: "/meus-dados" })}
    className={`flex items-center gap-2 rounded-xl cursor-pointer p-2 transition-colors ${
      theme === "dark" ? "hover:bg-white/5 focus:bg-white/5" : "hover:bg-zinc-100 focus:bg-zinc-100"
    }`}
  >
    <User className="h-4 w-4 text-zinc-400" />
    <span className="text-sm font-medium">Meus Dados</span>
  </DropdownMenuItem>

  {/* NOVA CHAVE DE TEMA CLARO / ESCURO */}
  <DropdownMenuItem 
    onClick={(e) => {
      e.preventDefault(); // Evita que o menu feche sozinho ao clicar na chave
      toggleTheme();
    }}
    className={`flex items-center justify-between rounded-xl cursor-pointer p-2 transition-colors ${
      theme === "dark" ? "hover:bg-white/5 focus:bg-white/5" : "hover:bg-zinc-100 focus:bg-zinc-100"
    }`}
  >
    <div className="flex items-center gap-2">
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-yellow-500" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-500" />
      )}
      <span className="text-sm font-medium">Aparência</span>
    </div>
    
    {/* INTERRUPTOR VISUAL (SWITCH) */}
    <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 flex items-center ${theme === "dark" ? "bg-purple-600 justify-end" : "bg-zinc-300 justify-start"}`}>
      <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md transition-all" />
    </div>
  </DropdownMenuItem>

  <DropdownMenuSeparator className={theme === "dark" ? "bg-white/10 my-1" : "bg-zinc-100 my-1"} />
  
  {/* BOTÃO DE SAIR */}
  <DropdownMenuItem 
    onClick={async () => {
      await signOut();
      fireToast("Você saiu da conta");
    }}
    className={`flex items-center gap-2 rounded-xl cursor-pointer p-2 transition-colors text-red-400 ${
      theme === "dark" ? "hover:bg-red-500/10 focus:bg-red-500/10" : "hover:bg-red-50 focus:bg-red-50 text-red-500"
    }`}
  >
    <LogOut className="h-4 w-4" />
    <span className="text-sm font-bold">Sair da Conta</span>
  </DropdownMenuItem>
</DropdownMenuContent>
</DropdownMenu>
            </div>
          ) : (
            <button
              onClick={() => navigate({ to: "/login", search: { redirect: "/" } })}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              <LogIn className="w-3 h-3" /> Entrar
            </button>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-[80px]">
          {section === "home" && (
            <HomeSection
              cheapest={cheapest}
              fireToast={fireToast}
              sortedPostos={sortedPostos}
              fuel={fuel}
              setFuel={setFuel}
              sortBy={sortBy}
              setSortBy={setSortBy}
              confirmed={confirmed}
              theme={theme}
              onConfirm={(name) =>
                requireAuth(() => {
                  setConfirmed([...confirmed, name]);
                  awardForAction("confirm_price");
                  fireToast("Obrigado! +5 pontos abastece+");
                }, "Faça login para confirmar o preço")
              }
            />
          )}

          {section === "carro" && (
            <CarroSection user={user} requireAuth={requireAuth} fireToast={fireToast} theme={theme} />
          )}

{section === "servicos" && (
  <section className="animate-in fade-in slide-in-from-bottom-4 pt-2">
    {/* Cabeçalho */}
    <div className="flex items-center gap-2 mb-5 pl-1">
      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-lg shadow-inner ${theme === "dark" ? "bg-white/10" : "bg-zinc-100"}`}>
        🛠️
      </span>
      <h3 className={`text-[13px] font-extrabold uppercase tracking-widest ${theme === "dark" ? "text-muted-foreground/80" : "text-zinc-500"}`}>
        Serviços em Votuporanga
      </h3>
    </div>

    {loading ? (
      <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div>
    ) : (
      <div className="space-y-4">
        {servicosOrdenados.length > 0 ? (
  servicosOrdenados.map((s, index) => {
    const isDark = theme === "dark";
    console.log("Propriedades do serviço:", s);

  
  return (
    <article
      key={index}
      className={`group relative flex flex-col rounded-[22px] border p-5 shadow-xl transition-all duration-300 ${
        isDark ? "bg-[#161618] border-white/5" : "bg-white border-zinc-200"
      }`}
    >
         <h3 className={`text-lg font-black uppercase mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
  {s.empresa_nome || "Nome da Empresa"}
</h3>

      <p className={`text-sm font-bold mb-3 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
        {s.name}
      </p>

      <div className="text-[11px] mb-4 opacity-70">
        <p>{s.address}</p>
        <p className="font-semibold mt-0.5">{s.hours}</p>
      </div>

      <div className="mb-4">
        <span className={`block text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
          Valor Estimado
        </span>
        <div className={`text-xl font-black ${isDark ? "text-white" : "text-zinc-900"}`}>
          {s.price}
        </div>
      </div>

      <Button 
        onClick={() => agendarViaWhatsApp(s)}
        className="w-full h-10 text-[12px] font-bold bg-primary hover:bg-primary/90 uppercase tracking-wider"
      >
        📅 Agendar no WhatsApp
      </Button>
    </article>
  );
})
        ) : (
          <p className="text-center text-sm text-zinc-500 pt-10">Nenhum serviço disponível no momento.</p>
        )}
      </div>
    )}
  </section>
)}


          {section === "plus" && (
            <PlusSection
              userId={userId}
              balance={balance}
              entries={entries.slice(0, 3)}
              isPremium={isPremium}
              setIsPremium={setIsPremium}
              refreshPoints={refreshPoints}
              requireAuth={requireAuth}
              fireToast={fireToast}
              theme= {theme}
            />
          )}
        </div>

      {/* Bottom nav — 4 tabs */}
        <nav className={`absolute bottom-0 left-0 right-0 z-10 flex h-[64px] items-center justify-around border-t transition-colors duration-200 ${
          theme === "dark"
            ? "glass-panel border-white/5 text-white"
            : "bg-white/95 border-zinc-200 text-zinc-600 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md"
        }`}>
          <NavItem icon={<Home className="w-5 h-5" />} label="Início" active={section === "home"} onClick={() => setSection("home")} />
          <NavItem icon={<Car className="w-5 h-5" />} label="Meu Carro" active={section === "carro"} onClick={() => goTo("carro", true)} />
          <NavItem icon={<Wrench className="w-5 h-5" />} label="Serviços" active={section === "servicos"} onClick={() => setSection("servicos")} />
          <NavItem icon={<Gift className="w-5 h-5" />} label="Prêmios" active={section === "plus"} onClick={() => goTo("plus", true)} />
        </nav>
      </div>
    </main>
  );
}

/* Auxiliar para itens da Bottom Nav */
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 w-14 h-full text-[10px] font-bold transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-white"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ---------- HOME ---------- */

function HomeSection({
  cheapest, fireToast, sortedPostos, fuel, setFuel, sortBy, setSortBy, confirmed, onConfirm, theme,
}: {
  cheapest: Posto;
  fireToast: (m: string) => void;
  sortedPostos: Posto[];
  fuel: Fuel; setFuel: (f: Fuel) => void;
  sortBy: SortBy; setSortBy: (s: SortBy) => void;
  confirmed: string[]; onConfirm: (name: string) => void;
  theme: string;
}) {
  return (
    <>
      <section className="mt-1 mb-4 flex flex-col gap-3 rounded-3xl bg-premium-gradient p-4 text-white shadow-lg shadow-blue-900/30">
        
        {/* Parte 1: Novo Carrossel Master Top substituindo o texto */}
        <div className="w-full overflow-hidden rounded-2xl border border-white/10 shadow-sm">
          <AdCarousel onAdClick={() => fireToast("Anúncio Top Premium clicado!")} />
        </div>

        {/* Parte 2: Indicador do Combustível Mais Barato (Mantido como estava) */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/20 px-4 py-3 backdrop-blur">
          <span className="text-xl">⛽</span>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">Etanol+ Barato em Votu</span>
            <strong className="text-sm font-extrabold">
              {cheapest?.name || "Buscando..."} {cheapest ? `— R$ ${fmt(cheapest.prices.etanol)}` : ""}
            </strong>
          </div>
        </div>
      </section>

      <PostosSection
        sortedPostos={sortedPostos}
        fuel={fuel}
        setFuel={setFuel}
        sortBy={sortBy}
        setSortBy={setSortBy}
        confirmed={confirmed}
        onConfirm={onConfirm}
        theme={theme}
      />

      <div className="mt-4">
        <AdCarousel onAdClick={() => fireToast("Quer anunciar no Abastece Votu? Fale conosco!")} />
      </div>
    </>
  );
}

/* ---------- POSTOS ---------- */

function PostosSection({
  sortedPostos, fuel, setFuel, sortBy, setSortBy, confirmed, onConfirm, theme
}: {
  sortedPostos: any[];
  fuel: "etanol" | "gasolina" | "diesel"; setFuel: (f: "etanol" | "gasolina" | "diesel") => void;
  sortBy: "price" | "distance"; setSortBy: (s: "price" | "distance") => void;
  confirmed: string[]; onConfirm: (name: string) => void;
  theme: string;
}) {
  const [convPosto, setConvPosto] = useState<any | null>(null);

  // Auxiliar para formatar moeda mantendo o padrão visual
  const fmt = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return "—";
    return val.toFixed(2).replace('.', ',');
  };

  /**
   * MAPEAMENTO CIRÚRGICO:
   * Converte a chave simplificada do app para o formato real gravado no Supabase
   */
  const getPrecoBanco = (posto: any, combustivelAtual: string) => {
    if (!posto || !posto.prices) return 0;
    
    if (combustivelAtual === "gasolina") {
      // Se o app pedir "gasolina", buscamos "gasolina_comum" ou "gasolina_aditivada" vindas do Supabase
      return posto.prices["gasolina_comum"] ?? posto.prices["gasolina"] ?? 0;
    }
    
    return posto.prices[combustivelAtual] ?? 0;
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 pt-2">
      
      {/* CABEÇALHO E FILTROS ESTILO FINTECH */}
      <div className="mb-5 space-y-3">
        <h3 className={`text-[13px] font-extrabold uppercase tracking-widest pl-1 transition-colors ${
          theme === "dark" ? "text-muted-foreground/80" : "text-zinc-500"
        }`}>
          Lista de Postos
        </h3>
        
        {/* Filtro de Combustível */}
        <div className={`flex gap-2 rounded-2xl p-1.5 border transition-all duration-200 ${
          theme === "dark" 
            ? "bg-[#121214] border-white/5" 
            : "bg-zinc-100 border-zinc-200/80"
        }`}>
          {(["etanol", "gasolina", "diesel"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFuel(f)}
              className={`flex-1 rounded-xl py-2 text-[12px] font-bold capitalize transition-all duration-200 ${
                fuel === f
                  ? theme === "dark"
                    ? "bg-white/10 text-white shadow-md border border-white/10"
                    : "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                  : theme === "dark"
                    ? "text-muted-foreground hover:bg-white/5 hover:text-white"
                    : "text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Filtro de Ordenação */}
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy("price")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
              sortBy === "price"
                ? theme === "dark"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm"
                : theme === "dark"
                  ? "border-white/5 bg-[#121214] text-muted-foreground hover:border-white/10 hover:text-white"
                  : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 shadow-sm"
            }`}
          >
            Análise de Preço
          </button>

          <button
            onClick={() => setSortBy("distance")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
              sortBy === "distance"
                ? theme === "dark"
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                  : "border-blue-200 bg-blue-50 text-blue-600 shadow-sm"
                : theme === "dark"
                  ? "border-white/5 bg-[#121214] text-muted-foreground hover:border-white/10 hover:text-white"
                  : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 shadow-sm"
            }`}
          >
            Proximidade
          </button>
        </div>
      </div>

      {/* LISTA DE CARDS ALTA FIDELIDADE */}
      <div className="space-y-4">
        {sortedPostos.map((p) => {
          const isConfirmed = confirmed.includes(p.name);
          const precoExibicao = getPrecoBanco(p, fuel);
          
          return (
            <article 
              key={p.name} 
              className={`relative flex flex-col rounded-[22px] border p-4 transition-all duration-200 ${
                theme === "dark"
                  ? "border-white/10 bg-[#161618] shadow-xl hover:bg-[#1a1a1d] hover:border-white/20"
                  : "border-zinc-200 bg-white shadow-md hover:shadow-lg hover:border-zinc-300"
              }`}
            >
              {/* Topo: Informações do Posto */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <h4 className={`truncate text-base font-bold transition-colors ${
                    theme === "dark" ? "text-white" : "text-zinc-900"
                  }`}>{p.name}</h4>
                  <p className={`truncate text-[11px] transition-colors ${
                    theme === "dark" ? "text-zinc-400" : "text-zinc-500"
                  }`}>{p.address}</p>
                  <p className={`mt-0.5 text-[10px] font-semibold transition-colors ${
                    theme === "dark" ? "text-zinc-500/80" : "text-zinc-400/90"
                  }`}>{p.hours}</p>
                </div>
                
                {p.produtos && (
                  <button
                    onClick={() => setConvPosto(p)}
                    className="shrink-0 flex items-center gap-1.5 rounded-full bg-brand-purple/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-purple border border-brand-purple/20 transition-all hover:bg-brand-purple/20"
                  >
                    Loja
                  </button>
                )}
              </div>

              {/* Meio: Tipografia de Preço Imponente */}
              <div className="flex items-end justify-between py-2">
                <div>
                  <span className={`block text-[10px] font-bold uppercase tracking-widest mb-0.5 transition-colors ${
                    theme === "dark" ? "text-zinc-500" : "text-zinc-400"
                  }`}>
                    Preço {fuel}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-sm font-bold transition-colors ${
                      theme === "dark" ? "text-emerald-500/70" : "text-emerald-600/80"
                    }`}>R$</span>
                    <span className={`text-4xl font-black tracking-tighter drop-shadow-sm transition-colors ${
                      theme === "dark" ? "text-emerald-400" : "text-emerald-600"
                    }`}>
                      {fmt(precoExibicao)}
                    </span>
                  </div>
                </div>
                <div className="mb-1 text-right">
                  <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition-colors ${
                    theme === "dark"
                      ? "bg-white/5 border-white/5 text-zinc-400"
                      : "bg-zinc-100 border-zinc-200 text-zinc-600"
                  }`}>
                    {p.distance} km
                  </span>
                </div>
              </div>

              {/* Rodapé: Validação */}
              <div className={`mt-3 flex items-center justify-between border-t pt-3 transition-colors ${
                theme === "dark" ? "border-white/5" : "border-zinc-100"
              }`}>
                <div className="flex flex-col text-[10px]">
                  <span className={`transition-colors ${
                    theme === "dark" ? "text-zinc-500" : "text-zinc-400"
                  }`}>Verificado por {p.verifiedBy}</span>
                  {isConfirmed && (
                    <span className={`font-bold mt-0.5 transition-colors ${
                      theme === "dark" ? "text-emerald-400" : "text-emerald-600"
                    }`}>✓ Você validou hoje</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    disabled={isConfirmed}
                    onClick={() => onConfirm(p.name)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                      isConfirmed 
                        ? theme === "dark"
                          ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 scale-105" 
                          : "bg-emerald-50 border-emerald-200 text-emerald-600 scale-105 shadow-sm"
                        : theme === "dark"
                          ? "bg-white/5 border-white/10 text-muted-foreground hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400"
                          : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 shadow-sm"
                    }`}
                    title="Preço correto (Like)"
                  >
                    👍
                  </button>

                  <button
                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                      theme === "dark"
                        ? "border-white/10 bg-white/5 text-muted-foreground hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                        : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 shadow-sm"
                    }`}
                    title="Preço incorrecto (Dislike)"
                    onClick={() => {}}
                  >
                    👎
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- MEU CARRO ---------- */

function CarroSection({
  user, requireAuth, fireToast, theme,
}: { 
  user: { id: string } | null; 
  requireAuth: (fn: () => void, m?: string) => void; 
  fireToast: (m: string) => void;
  theme: string; // Adicionado o tema aqui
}) {
  const { vehicle, save } = useVehicle(user?.id ?? null);
  const [form, setForm] = useState({
    marca: "", modelo: "", ano: "", placa: "",
    licenciamento_vencimento: "", seguro_vencimento: "",
  });
  
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (vehicle) {
      setForm({
        marca: vehicle.marca ?? "",
        modelo: vehicle.modelo ?? "",
        ano: vehicle.ano?.toString() ?? "",
        placa: vehicle.placa ?? "",
        licenciamento_vencimento: vehicle.licenciamento_vencimento ?? "",
        seguro_vencimento: vehicle.seguro_vencimento ?? "",
      });
      if (vehicle.marca && vehicle.modelo) {
        setIsExpanded(false);
      }
    }
  }, [vehicle]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return requireAuth(() => {});
    if (!form.marca || !form.modelo) return fireToast("Preencha marca e modelo");
    try {
      await save({
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        ano: form.ano ? parseInt(form.ano, 10) : null,
        placa: form.placa.trim() || null,
        licenciamento_vencimento: form.licenciamento_vencimento || null,
        seguro_vencimento: form.seguro_vencimento || null,
      });
      fireToast("Veículo salvo com sucesso!");
      setIsExpanded(false);
    } catch {
      fireToast("Erro ao salvar o veículo");
    }
  };

  const licDays = daysUntil(form.licenciamento_vencimento);
  const segDays = daysUntil(form.seguro_vencimento);
  const hasVehicle = Boolean(form.marca && form.modelo);

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 space-y-4 pt-2">
      
      <div className="flex items-center gap-2 mb-4">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-lg shadow-inner ${theme === "dark" ? "bg-white/10" : "bg-zinc-100"}`}>
          🚗
        </span>
        <h3 className={`text-[13px] font-extrabold uppercase tracking-widest ${theme === "dark" ? "text-muted-foreground/80" : "text-zinc-500"}`}>
          Garagem
        </h3>
      </div>

      {(licDays !== null && licDays <= 30) && (
        <Alert tone={licDays < 0 ? "danger" : "warn"} title={licDays < 0 ? "Licenciamento vencido" : `Licenciamento vence em ${licDays} dias`} />
      )}
      {(segDays !== null && segDays <= 30) && (
        <Alert tone={segDays < 0 ? "danger" : "warn"} title={segDays < 0 ? "Seguro vencido" : `Seguro vence em ${segDays} dias`} />
      )}

      {!isExpanded && hasVehicle ? (
        <div 
          onClick={() => setIsExpanded(true)}
          className={`group cursor-pointer relative overflow-hidden rounded-[22px] border p-5 shadow-xl transition-all duration-300 hover:-translate-y-0.5 ${
            theme === "dark" ? "border-white/10 bg-[#161618] hover:bg-[#1a1a1d] hover:border-white/20" : "border-zinc-200 bg-white hover:border-zinc-300 shadow-zinc-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className={`block text-[10px] font-bold uppercase tracking-widest ${theme === "dark" ? "text-muted-foreground/60" : "text-zinc-400"}`}>
                Veículo Principal
              </span>
              <h4 className={`mt-1 text-xl font-black tracking-tight transition-colors group-hover:text-emerald-500 ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
                {form.marca} {form.modelo}
              </h4>
              {form.placa && (
                <div className={`mt-2.5 inline-block rounded-lg border px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-widest shadow-inner ${theme === "dark" ? "border-white/10 bg-white/5 text-white/80" : "border-zinc-200 bg-zinc-50 text-zinc-600"}`}>
                  {form.placa}
                </div>
              )}
            </div>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${theme === "dark" ? "bg-white/5 text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-400" : "bg-zinc-100 text-zinc-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-500"}`}>
              ✏️
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={onSave} className={`relative rounded-[22px] border p-5 shadow-2xl ${theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white"}`}>
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-emerald-500">
              {hasVehicle ? "Editar Veículo" : "Novo Veículo"}
            </h4>
            {hasVehicle && (
              <button type="button" onClick={() => setIsExpanded(false)} className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${theme === "dark" ? "bg-white/5 text-muted-foreground hover:bg-white/10" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"}`}>
                ✕ Cancelar
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca"><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className={`${theme === "dark" ? "bg-[#121214] border-white/10" : "bg-zinc-50 border-zinc-200"}`} /></Field>
            <Field label="Modelo"><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} className={`${theme === "dark" ? "bg-[#121214] border-white/10" : "bg-zinc-50 border-zinc-200"}`} /></Field>
            <Field label="Ano"><Input value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} className={`${theme === "dark" ? "bg-[#121214] border-white/10" : "bg-zinc-50 border-zinc-200"}`} /></Field>
            <Field label="Placa"><Input value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })} className={`${theme === "dark" ? "bg-[#121214] border-white/10" : "bg-zinc-50 border-zinc-200"}`} /></Field>
            <Field label="Venc. Licenciamento"><Input type="date" value={form.licenciamento_vencimento} onChange={(e) => setForm({ ...form, licenciamento_vencimento: e.target.value })} className={`${theme === "dark" ? "bg-[#121214] border-white/10" : "bg-zinc-50 border-zinc-200"}`} /></Field>
            <Field label="Venc. Seguro"><Input type="date" value={form.seguro_vencimento} onChange={(e) => setForm({ ...form, seguro_vencimento: e.target.value })} className={`${theme === "dark" ? "bg-[#121214] border-white/10" : "bg-zinc-50 border-zinc-200"}`} /></Field>
          </div>
          <Button type="submit" className="mt-5 w-full rounded-xl bg-emerald-500 py-3 font-bold text-white transition-all hover:bg-emerald-600">
            {hasVehicle ? "Atualizar Dados" : "Salvar na Garagem"}
          </Button>
        </form>
      )}

      <div className="mt-8 space-y-4 pt-2 border-t border-zinc-500/10">
        <h3 className={`text-[13px] font-extrabold uppercase tracking-widest pl-1 mb-3 ${theme === "dark" ? "text-muted-foreground/80" : "text-zinc-500"}`}>
          Calculadoras Inteligentes
        </h3>
        <div className={`overflow-hidden rounded-[22px] border p-1 shadow-lg ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white"}`}>
          <FlexCalculator theme={theme} />
        </div>
        <div className={`overflow-hidden rounded-[22px] border p-1 shadow-lg ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white"}`}>
          <AverageCalculator theme={theme} />
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Alert({ tone, title }: { tone: "warn" | "danger"; title: string }) {
  const cls = tone === "danger"
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs font-semibold ${cls}`}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{title}</span>
    </div>
  );
}

function FlexCalculator({ theme }: { theme: string }) {
  const [e, setE] = useState("");
  const [g, setG] = useState("");
  
  const result = useMemo(() => {
    const ev = parseFloat(e.replace(",", "."));
    const gv = parseFloat(g.replace(",", "."));
    if (!ev || !gv) return null;
    const ratio = ev / gv;
    return ratio <= 0.7
      ? { winner: "Etanol compensa", pct: (ratio * 100).toFixed(0), good: true }
      : { winner: "Gasolina compensa", pct: (ratio * 100).toFixed(0), good: false };
  }, [e, g]);

  return (
    <div className={`space-y-3 rounded-2xl p-4 transition-colors duration-200 border ${
      theme === "dark" 
        ? "bg-[#161618] border-white/5" 
        : "bg-white border-zinc-100 shadow-sm"
    }`}>
      <h4 className={`text-xs font-bold uppercase tracking-wider ${
        theme === "dark" ? "text-muted-foreground" : "text-zinc-500"
      }`}>
        Calculadora Flex
      </h4>
      
      <div className="grid grid-cols-2 gap-2">
        <Field label="Etanol (R$)">
          <Input 
            value={e} 
            onChange={(ev) => setE(ev.target.value)} 
            placeholder="3,27" 
            inputMode="decimal"
            className={`transition-colors ${
              theme === "dark" ? "bg-[#121214] border-white/10 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
            }`}
          />
        </Field>
        <Field label="Gasolina (R$)">
          <Input 
            value={g} 
            onChange={(ev) => setG(ev.target.value)} 
            placeholder="5,49" 
            inputMode="decimal"
            className={`transition-colors ${
              theme === "dark" ? "bg-[#121214] border-white/10 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
            }`}
          />
        </Field>
      </div>

      {result && (
        <div className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
          result.good 
            ? "bg-emerald-500/20 text-emerald-500" 
            : theme === "dark" ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-500/10 text-indigo-600"
        }`}>
          {result.winner} ({result.pct}% da gasolina)
        </div>
      )}
    </div>
  );
}

function AverageCalculator({ theme }: { theme: string }) {
  console.log("Tema atual no componente:", theme);
  const [km, setKm] = useState("");
  const [l, setL] = useState("");
  
  const avg = useMemo(() => {
    const k = parseFloat(km.replace(",", "."));
    const lit = parseFloat(l.replace(",", "."));
    if (!k || !lit) return null;
    return (k / lit).toFixed(1);
  }, [km, l]);

  return (
    <div className={`space-y-3 rounded-2xl p-4 border transition-colors ${
      theme === "dark" 
        ? "bg-[#121214] border-white/5" 
        : "bg-white border-zinc-100 shadow-sm"
    }`}>
      <h4 className={`text-xs font-bold uppercase tracking-wider ${
        theme === "dark" ? "text-muted-foreground" : "text-zinc-400"
      }`}>
        Média de Combustível
      </h4>
      
      <div className="grid grid-cols-2 gap-2">
        <Field label="Km percorridos">
          <Input 
            value={km} 
            onChange={(e) => setKm(e.target.value)} 
            placeholder="420" 
            inputMode="decimal" 
            className={`${theme === "dark" ? "bg-[#161618] border-white/10" : "bg-zinc-50 border-zinc-200"}`}
          />
        </Field>
        <Field label="Litros abastecidos">
          <Input 
            value={l} 
            onChange={(e) => setL(e.target.value)} 
            placeholder="38" 
            inputMode="decimal" 
            className={`${theme === "dark" ? "bg-[#161618] border-white/10" : "bg-zinc-50 border-zinc-200"}`}
          />
        </Field>
      </div>

      {avg && (
        <div className={`rounded-lg px-3 py-2 text-sm font-bold ${
          theme === "dark" ? "bg-white/5 text-white" : "bg-zinc-100 text-zinc-900"
        }`}>
          Média: <span className="text-emerald-500">{avg} km/L</span>
        </div>
      )}
    </div>
  );
}

/* ---------- ABASTECE+ ---------- */

function PlusSection({
  userId, balance, entries, isPremium, setIsPremium, refreshPoints, requireAuth, fireToast, theme
}: {
  userId: string | null;
  balance: number;
  entries: { id: string; delta: number; descricao: string; created_at: string }[];
  isPremium: boolean;
  setIsPremium: (b: boolean) => void;
  refreshPoints: () => Promise<void>;
  requireAuth: (fn: () => void, m?: string) => void;
  fireToast: (m: string) => void;
  theme: string; // <-- Tema injetado aqui
}) {
  const rewards = useRewards();
  const [picked, setPicked] = useState<Reward | null>(null);
  const [showLock, setShowLock] = useState(false);
  const [redeemCode, setRedeemCode] = useState<string | null>(null);

  const tryRedeem = (r: Reward) => {
    if (!userId) return requireAuth(() => {});
    if (!isPremium) {
      setPicked(r);
      setShowLock(true);
      return;
    }
    if (balance < r.custo_pontos) {
      fireToast("Pontos insuficientes");
      return;
    }
    setPicked(r);
  };

  const confirmRedeem = async () => {
    if (!picked || !userId) return;
    const { data, error } = await (supabase.rpc as any)("redeem_reward", { _reward_id: picked.id });
    if (error || !data) return fireToast("Erro ao resgatar");
    await refreshPoints();
    setRedeemCode(data as string);
  };

  const subscribe = async () => {
    if (!userId) return;
    await supabase.from("profiles").update({ is_premium: true }).eq("id", userId);
    setIsPremium(true);
    setShowLock(false);
    fireToast("Bem-vindo ao abastece+ Premium!");
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 space-y-6 pt-2">
      
      {/* ESPAÇO PARA BANNER DE ANÚNCIOS (Substituindo Saldo e Histórico) */}
      <div className={`relative overflow-hidden rounded-[22px] border shadow-xl p-0.5 transition-colors ${
        theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white shadow-zinc-100"
      }`}>
        <div className={`flex h-36 w-full items-center justify-center rounded-[20px] border border-dashed transition-colors ${
          theme === "dark" ? "border-white/20 bg-[#1a1a1d]" : "border-zinc-300 bg-zinc-50"
        }`}>
          <div className="text-center opacity-60 flex flex-col items-center">
            <span className="text-2xl mb-2">📢</span>
            <p className={`text-[11px] font-bold uppercase tracking-widest ${theme === "dark" ? "text-muted-foreground" : "text-zinc-500"}`}>
              Espaço Publicitário
            </p>
            <p className={`text-[10px] mt-1 ${theme === "dark" ? "text-muted-foreground" : "text-zinc-400"}`}>
              Banner 300x100 ou equivalente
            </p>
          </div>
        </div>
      </div>

      {/* REWARDS GRID - PRÊMIOS DISPONÍVEIS */}
      <div>
        <div className="flex items-center gap-2 mb-4 pl-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-lg shadow-inner">
            🎁
          </span>
          <h3 className={`text-[13px] font-extrabold uppercase tracking-widest ${
            theme === "dark" ? "text-muted-foreground/80" : "text-zinc-500"
          }`}>
            Prêmios Disponíveis
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {rewards.map((r) => (
            <div 
              key={r.id} 
              className={`group relative flex flex-col overflow-hidden rounded-[22px] border p-4 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-emerald-500/30 ${
                theme === "dark" 
                  ? "bg-[#161618] border-white/10 hover:bg-[#1a1a1d]" 
                  : "bg-white border-zinc-200 hover:bg-zinc-50 shadow-zinc-100"
              }`}
            >
              <div className="mb-3 text-3xl drop-shadow-md">{r.emoji ?? "🎁"}</div>
              <h4 className={`text-[13px] font-bold leading-tight mb-1 transition-colors group-hover:text-emerald-500 ${
                theme === "dark" ? "text-white" : "text-zinc-900"
              }`}>
                {r.nome}
              </h4>
              <p className={`mb-4 text-[11px] line-clamp-2 h-8 ${theme === "dark" ? "text-muted-foreground/80" : "text-zinc-500"}`}>
                {r.descricao}
              </p>
              
              <div className={`mt-auto border-t pt-3 ${theme === "dark" ? "border-white/5" : "border-zinc-100"}`}>
                <div className="mb-3 flex flex-col">
                  <span className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${
                    theme === "dark" ? "text-muted-foreground/60" : "text-zinc-400"
                  }`}>
                    Custo
                  </span>
                  <span className={`text-lg font-black tracking-tight ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
                    {r.custo_pontos} <span className="text-[10px] opacity-70">pts</span>
                  </span>
                </div>
                
                <button
                  onClick={() => tryRedeem(r)}
                  className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 border ${
                    isPremium 
                      ? "bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] border-emerald-500" 
                      : theme === "dark"
                        ? "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-white"
                        : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-700"
                  }`}
                >
                  {isPremium ? (
                    "Resgatar"
                  ) : (
                    <>
                      <Lock className="h-3 w-3" /> Exclusivo Premium
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PREMIUM LOCK MODAL */}
      <Dialog open={showLock} onOpenChange={setShowLock}>
        <DialogContent className={`max-w-sm rounded-[24px] border p-6 shadow-2xl ${
          theme === "dark" ? "bg-[#161618] border-white/10" : "bg-white border-zinc-200"
        }`}>
          <DialogHeader className="text-center flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-[0_0_20px_rgba(251,191,36,0.3)] text-white">
              <Crown className="h-8 w-8" />
            </div>
            <DialogTitle className={`text-xl font-black ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
              Resgate Exclusivo
            </DialogTitle>
            <DialogDescription className={`text-sm mt-2 ${theme === "dark" ? "text-muted-foreground" : "text-zinc-500"}`}>
              Assine o abastece+ Premium e troque seus pontos por prêmios em postos parceiros.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex-col gap-3 sm:justify-start">
            <Button 
              className="w-full h-12 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 font-bold text-white shadow-lg hover:brightness-110 border-0" 
              onClick={subscribe}
            >
              Seja Premium Agora
            </Button>
            <Button 
              variant="outline" 
              className={`w-full h-12 rounded-xl bg-transparent transition-colors ${
                theme === "dark" ? "border-white/10 text-white hover:bg-white/5" : "border-zinc-200 text-zinc-600 hover:bg-zinc-100"
              }`} 
              onClick={() => setShowLock(false)}
            >
              Voltar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REDEEM SUCCESS MODAL */}
      <Dialog open={!!redeemCode} onOpenChange={(o) => !o && setRedeemCode(null)}>
        <DialogContent className={`max-w-sm rounded-[24px] border p-6 text-center shadow-2xl ${
          theme === "dark" ? "bg-[#161618] border-white/10" : "bg-white border-zinc-200"
        }`}>
          <DialogHeader className="flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <DialogTitle className={`text-xl font-black ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
              Resgate Realizado!
            </DialogTitle>
            <DialogDescription className={`text-sm mt-2 ${theme === "dark" ? "text-muted-foreground" : "text-zinc-500"}`}>
              Apresente o QR Code ou o código abaixo no posto para retirar seu prêmio.
            </DialogDescription>
          </DialogHeader>
          <div className="my-6 flex flex-col items-center justify-center gap-4">
            {redeemCode && (
              <div className="rounded-2xl bg-white p-3 shadow-lg border border-zinc-200">
                <QRCodeSVG value={redeemCode} size={160} />
              </div>
            )}
            <span className={`rounded-xl border px-4 py-2 text-xl font-mono font-bold tracking-widest text-emerald-500 ${
              theme === "dark" ? "bg-white/5 border-white/10" : "bg-emerald-50 border-emerald-500/20"
            }`}>
              {redeemCode}
            </span>
          </div>
          <DialogFooter>
            <Button 
              className={`w-full h-12 rounded-xl font-bold border-0 transition-colors ${
                theme === "dark" ? "bg-white/10 text-white hover:bg-white/20" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`} 
              onClick={() => setPicked(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}