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

const postos: Posto[] = [
  { name: "Posto Avenida", address: "Av. Brasil, 1200 — Centro", hours: "Aberto 24h", prices: { etanol: 3.27, gasolina: 5.49, diesel: 5.89 }, distance: 1.2, verifiedBy: 12, produtos: convPadrao },
  { name: "Posto São José", address: "R. Amazonas, 540 — Pozzobon", hours: "06h — 23h", prices: { etanol: 3.34, gasolina: 5.55, diesel: 5.95 }, distance: 2.8, verifiedBy: 8, produtos: [
    { name: "Café Expresso", price: "R$ 4,00" },
    { name: "Coxinha de Frango", price: "R$ 8,00" },
    { name: "Suco Natural 300ml", price: "R$ 9,00" },
    { name: "Sanduíche Natural", price: "R$ 12,00" },
    { name: "Barra de Cereal", price: "R$ 3,50" },
  ] },
  { name: "Auto Posto Cidade", address: "Av. Nasser Marão, 88", hours: "Aberto 24h", prices: { etanol: 3.39, gasolina: 5.59, diesel: 5.99 }, distance: 0.6, verifiedBy: 5, produtos: [
    { name: "Café Expresso", price: "R$ 4,50" },
    { name: "Pão de Queijo", price: "R$ 5,50" },
    { name: "Energético 250ml", price: "R$ 10,00" },
    { name: "Água Mineral 500ml", price: "R$ 3,50" },
    { name: "Biscoito Recheado", price: "R$ 4,00" },
  ] },
];

const fmt = (n: number) => n.toFixed(2).replace(".", ",");

type Servico = {
  name: string;
  address: string;
  hours: string;
  price: string;
  categoria: string;
  distance: number;
};

const servicos: Servico[] = [
  { name: "Troca de Óleo Premium", address: "Av. Brasil, 1500 — Centro", hours: "08h — 18h", price: "R$ 159", categoria: "Troca de Óleo", distance: 1.4 },
  { name: "Higienização AR Cond.", address: "R. São Paulo, 220 — Pozzobon", hours: "09h — 19h", price: "R$ 89", categoria: "Lava Rápido", distance: 2.1 },
  { name: "Alinhamento + Balanceamento", address: "Av. Nasser Marão, 950", hours: "08h — 18h", price: "R$ 119", categoria: "Oficina Mecânica", distance: 0.9 },
];

function Index() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    
    // Altera a classe na raiz do HTML para o Tailwind aplicar o Dark/Light no resto do app
    if (nextTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  };
  // Lógica inteligente do botão abastece+ do topo
  const handleAbasteceMaisClick = () => {
    if (user && isPremium) {
      // Se tem conta E é assinante: vai para a tela de prêmios/benefícios
      setSection("plus"); 
    } else {
      // Se não tem conta OU tem conta grátis: vai para a tela de planos
      setSection("planos"); 
    }
  };
  const navigate = useNavigate();
  const { user, displayName, initials, signOut, loading } = useAuth();
  const userId = user?.id ?? null;

  const [section, setSection] = useState<Section>("home");
  const [showPointsPanel, setShowPointsPanel] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [fuel, setFuel] = useState<Fuel>("etanol");
  const [sortBy, setSortBy] = useState<SortBy>("price");
  const [confirmed, setConfirmed] = useLocalStorage<string[]>("abastece_confirmed_today", []);
  
  // Controle de Splash Screen Premium
  const [showSplash, setShowSplash] = useState(true);

  const { entries, balance, refresh: refreshPoints, awardForAction } = usePoints(userId);
  const { isPremium, setIsPremium } = usePremium(userId);

  // 👑 TODOS OS HOOKS DEVEM FICAR AQUI NO TOPO
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const sortedPostos = useMemo(() => {
    const copy = [...postos];
    copy.sort((a, b) => (sortBy === "price" ? a.prices[fuel] - b.prices[fuel] : a.distance - b.distance));
    return copy;
  }, [fuel, sortBy]);

  const cheapest = useMemo(() => [...postos].sort((a, b) => a.prices.etanol - b.prices.etanol)[0], []);

  // 🛑 OS RETORNOS CONDICIONAIS DE TELA SÓ ENTRAN DAQUI PARA BAIXO
  if (loading || showSplash) {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center bg-[#0B0F19] p-4 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="relative p-4">
           <img 
              src={logoBranca} // <-- Força a branca aqui porque o fundo desse splash é sempre escuro
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

  // ... restante do código do return principal (header, content, nav...) segue igualzinho abaixo

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
    className={`w-54 rounded-[20px] shadow-xl p-2 transition-colors duration-200 border ${theme === "dark" ? "text-white" : "text-zinc-900"}`}
  >
    <DropdownMenuLabel className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1.5 ${theme === "dark" ? "text-muted-foreground" : "text-zinc-400"}`}>
      Minha Conta
    </DropdownMenuLabel>
    
    <DropdownMenuSeparator className={theme === "dark" ? "bg-white/10 my-1" : "bg-zinc-100 my-1"} />
    
   {/* Opção de Configurações */}
          <DropdownMenuItem 
            onClick={() => navigate({ to: "/meus-dados" })}
            className={`flex items-center gap-2 rounded-xl cursor-pointer p-2 transition-colors ${
              theme === "dark" ? "hover:bg-white/5" : "hover:bg-zinc-100"
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
      className={`flex items-center justify-between rounded-xl cursor-pointer p-2 transition-colors ${theme === "dark" ? "focus:bg-white/5" : "focus:bg-zinc-100"}`}
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
      className="flex items-center gap-2 rounded-xl cursor-pointer p-2 focus:bg-red-500/10 focus:text-red-400 text-red-400 transition-colors"
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
            <CarroSection user={user} requireAuth={requireAuth} fireToast={fireToast} />
          )}

{section === "servicos" && (
            <section className="animate-in fade-in slide-in-from-bottom-4 pt-2">
              
              {/* CABEÇALHO */}
              <div className="flex items-center gap-2 mb-5 pl-1">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg shadow-inner">
                  🛠️
                </span>
                <h3 className="text-[13px] font-extrabold uppercase tracking-widest text-muted-foreground/80">
                  Serviços Automotivos
                </h3>
              </div>

              {/* LISTA DE SERVIÇOS */}
              <div className="space-y-4">
                {servicos.map((s) => (
                  <article 
                    key={s.name} 
                    className="group relative flex flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#161618] p-5 shadow-xl transition-all duration-300 hover:bg-[#1a1a1d] hover:border-white/20 hover:shadow-2xl"
                  >
                    {/* Topo: Nome, Endereço e Categoria */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-base font-bold text-white transition-colors group-hover:text-blue-400">
                          {s.name}
                        </h4>
                        <p className="truncate text-[11px] text-muted-foreground">{s.address}</p>
                        <p className="mt-1 text-[10px] font-semibold text-muted-foreground/60">{s.hours}</p>
                      </div>
                      
                      {/* Badge da Categoria */}
                      <span className="shrink-0 flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-blue-400 border border-blue-500/20">
                        {s.categoria}
                      </span>
                    </div>

                    {/* Meio: Preço e Distância */}
                    <div className="flex items-end justify-between py-2">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">
                          Valor Estimado
                        </span>
                        <div className="text-2xl font-black tracking-tight text-white drop-shadow-sm">
                          {s.price}
                        </div>
                      </div>
                      <div className="mb-1 text-right">
                        <span className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-bold text-muted-foreground border border-white/5">
                          {s.distance} km
                        </span>
                      </div>
                    </div>

                    {/* Rodapé: Botão de Agendamento Full-Width */}
                    <div className="mt-3 border-t border-white/5 pt-4">
                      <button
                        onClick={() => requireAuth(() => fireToast(`${s.name} agendado!`), "Faça login para agendar")}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-[12px] font-bold uppercase tracking-wider text-white border border-white/10 transition-all hover:bg-blue-500 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] active:scale-[0.98]"
                      >
                        📅 Agendar Serviço
                      </button>
                    </div>
                  </article>
                ))}
              </div>

            </section>
          )}
          {section === "planos" && (
  <div className="flex flex-col items-center justify-center p-6 bg-[#0f111a] min-h-screen">
    <h1 className="text-3xl font-black text-white mb-2 text-center">Potencialize sua economia com o Abastece+</h1>
    <p className="text-muted-foreground text-center mb-10 max-w-sm">Escolha o plano ideal para o seu perfil e destrave ferramentas inteligentes.</p>
    
    <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
      {/* CARD GRÁTIS */}
      <div className="border border-white/10 bg-[#161618] rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white">Comunidade</h2>
        <p className="text-3xl font-black text-white my-4">R$ 0 <span className="text-sm font-normal">/sempre</span></p>
        <ul className="space-y-3 mb-6 text-sm text-white/70">
          <li>✓ Lista de postos por preço</li>
          <li>✓ Mapa interativo</li>
          <li>✓ Histórico básico</li>
          <li>✓ Colaboração</li>
        </ul>
        <button onClick={() => setSection("home")} className="w-full py-3 rounded-xl border border-white/10 text-white font-bold">
          Acessar Versão Grátis
        </button>
      </div>

      {/* CARD PREMIUM */}
      <div className="border-2 border-purple-500 bg-[#161618] rounded-2xl p-6 relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">Mais Assinado</div>
        <h2 className="text-xl font-bold text-white mt-2">Abastece+ Pro</h2>
        <p className="text-3xl font-black text-white my-4">R$ 9,90 <span className="text-sm font-normal">/mês</span></p>
        <ul className="space-y-3 mb-6 text-sm text-white/70">
          <li>✓ Todos os recursos Comunidade</li>
          <li>✓ Alertas em tempo real</li>
          <li>✓ Gráficos de tendência</li>
          <li>✓ Vantagens exclusivas</li>
          <li>✓ Suporte e sem anúncios</li>
        </ul>
        <button className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700">
          Assinar e Ativar no App
        </button>
      </div>
    </div>
  </div>
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
      <section className="mt-1 mb-4 rounded-3xl bg-premium-gradient p-5 text-white shadow-lg shadow-blue-900/30">
        <h2 className="mb-1 text-2xl font-extrabold leading-tight">Combustível mais barato da cidade</h2>
        <p className="mb-4 text-xs opacity-90">Compare preços em tempo real validados pela comunidade.</p>
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
  const fmt = (val: number) => val.toFixed(2).replace('.', ',');

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
          {/* Botão Menor Preço */}
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
            📉 Menor Preço
          </button>

          {/* Botão Mais Próximo */}
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
            📍 Mais Próximo
          </button>
        </div>
      </div>

     {/* LISTA DE CARDS ALTA FIDELIDADE */}
      <div className="space-y-4">
        {sortedPostos.map((p) => {
          const isConfirmed = confirmed.includes(p.name);
          
          return (
            <article 
              key={p.name} 
              className={`relative flex flex-col rounded-[22px] border p-4 transition-all duration-200 ${
                theme === "dark"
                  ? "border-white/10 bg-[#161618] shadow-xl hover:bg-[#1a1a1d] hover:border-white/20"
                  : "border-zinc-200 bg-white shadow-md hover:shadow-lg hover:border-zinc-300"
              }`}
            >
              {/* Topo: Informações do Posto + Botão Conveniência */}
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
                    🛒 Loja
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
                      {fmt(p.prices[fuel])}
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

              {/* Rodapé: Validação e Sistema de Avaliação (Like/Dislike) */}
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
                  {/* Botão de Like */}
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
                    <span className="text-lg">👍</span>
                  </button>

                  {/* Botão de Dislike */}
                  <button
                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                      theme === "dark"
                        ? "border-white/10 bg-white/5 text-muted-foreground hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                        : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 shadow-sm"
                    }`}
                    title="Preço incorreto (Dislike)"
                    onClick={() => {
                      // Espaço para futura função de dislike
                    }}
                  >
                    <span className="text-lg">👎</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* DIALOG DE CONVENIÊNCIA ESTILIZADO */}
      <Dialog open={!!convPosto} onOpenChange={(o) => !o && setConvPosto(null)}>
        <DialogContent className="max-w-sm border-white/10 bg-[#121214] text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              🛒 Loja de Conveniência
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {convPosto?.name}
            </DialogDescription>
          </DialogHeader>
          <ul className="my-2 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/5 px-4 py-2">
            {convPosto?.produtos?.map((prod: any) => (
              <li key={prod.name} className="flex items-center justify-between py-3">
                <span className="text-sm font-semibold text-white/90">{prod.name}</span>
                <span className="text-sm font-black text-emerald-400">{prod.price}</span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <button 
              className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
              onClick={() => setConvPosto(null)}
            >
              Fechar Catálogo
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ---------- MEU CARRO ---------- */

function CarroSection({
  user, requireAuth, fireToast,
}: { user: { id: string } | null; requireAuth: (fn: () => void, m?: string) => void; fireToast: (m: string) => void }) {
  const { vehicle, save } = useVehicle(user?.id ?? null);
  const [form, setForm] = useState({
    marca: "", modelo: "", ano: "", placa: "",
    licenciamento_vencimento: "", seguro_vencimento: "",
  });
  
  // Controle de estado para exibir o formulário ou o card de resumo
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
      // Se já houver um carro cadastrado válido, esconde o formulário
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
      setIsExpanded(false); // Retrai o form após o sucesso
    } catch {
      fireToast("Erro ao salvar o veículo");
    }
  };

  const licDays = daysUntil(form.licenciamento_vencimento);
  const segDays = daysUntil(form.seguro_vencimento);
  
  // Verifica se existe um veículo mínimo para mostrar o card
  const hasVehicle = Boolean(form.marca && form.modelo);

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 space-y-4 pt-2">
      
      {/* CABEÇALHO */}
      <div className="flex items-center gap-2 mb-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg shadow-inner">
          🚗
        </span>
        <h3 className="text-[13px] font-extrabold uppercase tracking-widest text-muted-foreground/80">
          Garagem
        </h3>
      </div>

      {/* ALERTAS INTELIGENTES */}
      {(licDays !== null && licDays <= 30) && (
        <Alert
          tone={licDays < 0 ? "danger" : "warn"}
          title={licDays < 0 ? "Licenciamento vencido" : `Licenciamento vence em ${licDays} dias`}
        />
      )}
      {(segDays !== null && segDays <= 30) && (
        <Alert
          tone={segDays < 0 ? "danger" : "warn"}
          title={segDays < 0 ? "Seguro vencido" : `Seguro vence em ${segDays} dias`}
        />
      )}

      {/* RENDERIZAÇÃO CONDICIONAL: CARD DE RESUMO vs FORMULÁRIO */}
      {!isExpanded && hasVehicle ? (
        
        <div 
          onClick={() => setIsExpanded(true)}
          className="group cursor-pointer relative overflow-hidden rounded-[22px] border border-white/10 bg-[#161618] p-5 shadow-xl transition-all duration-300 hover:bg-[#1a1a1d] hover:border-white/20 hover:shadow-2xl hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Veículo Principal
              </span>
              <h4 className="mt-1 text-xl font-black tracking-tight text-white transition-colors group-hover:text-emerald-400">
                {form.marca} {form.modelo}
              </h4>
              {form.placa && (
                <div className="mt-2.5 inline-block rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-widest text-white/80 shadow-inner">
                  {form.placa}
                </div>
              )}
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted-foreground transition-all group-hover:bg-emerald-500/10 group-hover:text-emerald-400">
              ✏️
            </div>
          </div>
        </div>

      ) : (

        <form onSubmit={onSave} className="relative rounded-[22px] border border-white/10 bg-[#161618] p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
              {hasVehicle ? "Editar Veículo" : "Novo Veículo"}
            </h4>
            {hasVehicle && (
              <button 
                type="button" 
                onClick={() => setIsExpanded(false)}
                className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition hover:bg-white/10 hover:text-white"
              >
                ✕ Cancelar
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca">
              <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Ex: Fiat" maxLength={40} className="bg-[#121214] border-white/10 focus:border-emerald-500/50" />
            </Field>
            <Field label="Modelo">
              <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="Ex: Uno" maxLength={40} className="bg-[#121214] border-white/10 focus:border-emerald-500/50" />
            </Field>
            <Field label="Ano">
              <Input value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} placeholder="2020" inputMode="numeric" maxLength={4} className="bg-[#121214] border-white/10 focus:border-emerald-500/50" />
            </Field>
            <Field label="Placa">
              <Input value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })} placeholder="ABC1D23" maxLength={8} className="font-mono uppercase bg-[#121214] border-white/10 focus:border-emerald-500/50" />
            </Field>
            <Field label="Venc. Licenciamento">
              <Input type="date" value={form.licenciamento_vencimento} onChange={(e) => setForm({ ...form, licenciamento_vencimento: e.target.value })} className="bg-[#121214] border-white/10 focus:border-emerald-500/50 text-white/90" />
            </Field>
            <Field label="Venc. Seguro">
              <Input type="date" value={form.seguro_vencimento} onChange={(e) => setForm({ ...form, seguro_vencimento: e.target.value })} className="bg-[#121214] border-white/10 focus:border-emerald-500/50 text-white/90" />
            </Field>
          </div>
          <Button type="submit" className="mt-5 w-full rounded-xl bg-emerald-500 py-3 font-bold text-white transition-all hover:bg-emerald-600 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            {hasVehicle ? "Atualizar Dados" : "Salvar na Garagem"}
          </Button>
        </form>
        
      )}

      {/* CALCULADORAS ENVELOPADAS EM CARDS PREMIUM */}
      <div className="mt-8 space-y-4 pt-2 border-t border-white/5">
        <h3 className="text-[13px] font-extrabold uppercase tracking-widest text-muted-foreground/80 pl-1 mb-3">
          Calculadoras Inteligentes
        </h3>
        
        {/* Contêiner da Calculadora Flex */}
        <div className="overflow-hidden rounded-[22px] border border-white/5 bg-[#161618] p-1 shadow-lg">
          <FlexCalculator />
        </div>
        
        {/* Contêiner da Calculadora de Média */}
        <div className="overflow-hidden rounded-[22px] border border-white/5 bg-[#161618] p-1 shadow-lg">
          <AverageCalculator />
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

function FlexCalculator() {
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
    <div className="glass-card space-y-3 rounded-2xl p-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Calculadora Flex</h4>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Etanol (R$)"><Input value={e} onChange={(ev) => setE(ev.target.value)} placeholder="3,27" inputMode="decimal" /></Field>
        <Field label="Gasolina (R$)"><Input value={g} onChange={(ev) => setG(ev.target.value)} placeholder="5,49" inputMode="decimal" /></Field>
      </div>
      {result && (
        <div className={`rounded-lg px-3 py-2 text-sm font-bold ${result.good ? "bg-success/15 text-price" : "bg-primary/10 text-white"}`}>
          {result.winner} ({result.pct}% da gasolina)
        </div>
      )}
    </div>
  );
}

function AverageCalculator() {
  const [km, setKm] = useState("");
  const [l, setL] = useState("");
  const avg = useMemo(() => {
    const k = parseFloat(km.replace(",", "."));
    const lit = parseFloat(l.replace(",", "."));
    if (!k || !lit) return null;
    return (k / lit).toFixed(1);
  }, [km, l]);
  return (
    <div className="glass-card space-y-3 rounded-2xl p-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Média de Combustível</h4>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Km percorridos"><Input value={km} onChange={(e) => setKm(e.target.value)} placeholder="420" inputMode="decimal" /></Field>
        <Field label="Litros abastecidos"><Input value={l} onChange={(e) => setL(e.target.value)} placeholder="38" inputMode="decimal" /></Field>
      </div>
      {avg && (
        <div className="rounded-lg bg-secondary px-3 py-2 text-sm font-bold text-white">
          Média: <span className="text-price">{avg} km/L</span>
        </div>
      )}
    </div>
  );
}

/* ---------- ABASTECE+ ---------- */

function PlusSection({
  userId, balance, entries, isPremium, setIsPremium, refreshPoints, requireAuth, fireToast,
}: {
  userId: string | null;
  balance: number;
  entries: { id: string; delta: number; descricao: string; created_at: string }[];
  isPremium: boolean;
  setIsPremium: (b: boolean) => void;
  refreshPoints: () => Promise<void>;
  requireAuth: (fn: () => void, m?: string) => void;
  fireToast: (m: string) => void;
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
      <div className="relative overflow-hidden rounded-[22px] border border-white/5 bg-[#161618] shadow-xl p-0.5">
        <div className="flex h-36 w-full items-center justify-center rounded-[20px] border border-dashed border-white/20 bg-[#1a1a1d]">
          <div className="text-center opacity-60 flex flex-col items-center">
            <span className="text-2xl mb-2">📢</span>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Espaço Publicitário
            </p>
            <p className="text-[10px] mt-1 text-muted-foreground">Banner 300x100 ou equivalente</p>
          </div>
        </div>
      </div>

      {/* REWARDS GRID - PRÊMIOS DISPONÍVEIS */}
      <div>
        <div className="flex items-center gap-2 mb-4 pl-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-lg shadow-inner">
            🎁
          </span>
          <h3 className="text-[13px] font-extrabold uppercase tracking-widest text-muted-foreground/80">
            Prêmios Disponíveis
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {rewards.map((r) => (
            <div 
              key={r.id} 
              className="group relative flex flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#161618] p-4 shadow-xl transition-all duration-300 hover:bg-[#1a1a1d] hover:border-emerald-500/30 hover:shadow-2xl"
            >
              <div className="mb-3 text-3xl drop-shadow-md">{r.emoji ?? "🎁"}</div>
              <h4 className="text-[13px] font-bold leading-tight text-white mb-1 transition-colors group-hover:text-emerald-400">
                {r.nome}
              </h4>
              <p className="mb-4 text-[11px] text-muted-foreground/80 line-clamp-2 h-8">
                {r.descricao}
              </p>
              
              <div className="mt-auto border-t border-white/5 pt-3">
                <div className="mb-3 flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">
                    Custo
                  </span>
                  <span className="text-lg font-black tracking-tight text-white">
                    {r.custo_pontos} <span className="text-[10px] opacity-70">pts</span>
                  </span>
                </div>
                
                <button
                  onClick={() => tryRedeem(r)}
                  className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                    isPremium 
                      ? "bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500" 
                      : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10 hover:text-white"
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
        <DialogContent className="max-w-sm rounded-[24px] border border-white/10 bg-[#161618] p-6 shadow-2xl">
          <DialogHeader className="text-center flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-[0_0_20px_rgba(251,191,36,0.3)] text-white">
              <Crown className="h-8 w-8" />
            </div>
            <DialogTitle className="text-xl font-black text-white">Resgate Exclusivo</DialogTitle>
            <DialogDescription className="text-sm mt-2 text-muted-foreground">
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
              className="w-full h-12 rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white" 
              onClick={() => setShowLock(false)}
            >
              Voltar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REDEEM SUCCESS MODAL */}
      <Dialog open={!!redeemCode} onOpenChange={(o) => !o && setRedeemCode(null)}>
        <DialogContent className="max-w-sm rounded-[24px] border border-white/10 bg-[#161618] p-6 text-center shadow-2xl">
          <DialogHeader className="flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <DialogTitle className="text-xl font-black text-white">Resgate Realizado!</DialogTitle>
            <DialogDescription className="text-sm mt-2 text-muted-foreground">
              Apresente o QR Code ou o código abaixo no posto para retirar seu prêmio.
            </DialogDescription>
          </DialogHeader>
          <div className="my-6 flex flex-col items-center justify-center gap-4">
            {redeemCode && (
              <div className="rounded-2xl bg-white p-3 shadow-lg">
                <QRCodeSVG value={redeemCode} size={160} />
              </div>
            )}
            <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xl font-mono font-bold tracking-widest text-emerald-400">
              {redeemCode}
            </span>
          </div>
          <DialogFooter>
            <Button 
              className="w-full h-12 rounded-xl bg-white/10 font-bold text-white hover:bg-white/20 border-0" 
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