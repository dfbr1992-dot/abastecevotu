import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { InstallButton } from "@/components/InstallButton";
import logoBranca from "@/abastece.png";
import logoPreta from "@/abastece2.png";
import logoAbasteceVotu from "@/assets/logo-abastece-votu.gif";
import { AdCarousel } from "@/components/AdCarousel";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useAuth } from "@/hooks/use-auth";
import { useVehicle, daysUntil } from "@/hooks/use-vehicle";
import { usePremium } from "@/hooks/use-rewards";
import { usePremiosPorPosto, useSaldoPorPosto, type Premio } from "@/hooks/use-premios";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { usePostos, useServicos } from "@/hooks/use-data-queries";
import { usePostoServicos } from "@/hooks/usePostoServicos";
import { fmtCurrency } from "@/lib/utils-fmt";
import { AccessControl } from "@/components/AccessControl";
import MeuConsumoScreen from "@/components/MeuConsumoScreen";
import AbastecerModal from "@/components/AbastecerModal";
import ComingSoonOverlay from "@/components/ComingSoonOverlay";
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
  Car,
  Wrench,
  Gift,
  Lock,
  AlertTriangle,
  Crown,
  Loader2,
  LogIn,
  Sun,
  Moon,
  Star,
  StarHalf,
  User,
  MapPin,
  Heart,
  Navigation,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Plus,
  History,
  Droplets,
  Zap,
  Award,
  Trophy,
  ShieldCheck,
  Bell,
  ChevronDown,
  ShoppingCart,
  Flame,
  Ticket,
  X,
  Pencil,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

type Section = "home" | "postos" | "carro" | "servicos" | "premios" | "assinatura";
type Fuel = "etanol" | "gasolina" | "diesel";
type SortBy = "price" | "distance";

type Produto = { name: string; price: string };

type Posto = {
  id: string;
  name: string;
  address: string;
  hours: string;
  prices: Record<Fuel, number>;
  distance: number | null;
  verifiedBy?: number;
  produtos?: Produto[];
  likes?: number;
  dislikes?: number;
  lat?: number | null;
  lng?: number | null;
};

type Servico = {
  name: string;
  empresa_nome?: string;
  address?: string;
  hours?: string;
  price: string | null;
  categoria: string;
  distance?: number;
  destaque?: boolean;
  ordem?: number;
  whatsapp?: string;
  description?: string;
};

const fmt = fmtCurrency;

const generateHistoryData = (currentPrice: number) => {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  return days.map((day, i) => ({
    name: day,
    price: currentPrice + (Math.random() * 0.4 - 0.2),
  }));
};

function Index() {
  // 1. ESTADOS PRINCIPAIS
  const { data: postos = [], isLoading: loadingPostos } = usePostos();
  const { data: dadosServicos = [], isLoading: loadingServicos } = useServicos();
  const { user, displayName, signOut, loading: authLoading } = useAuth(); 
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const navigate = useNavigate();

  const loading = loadingPostos || loadingServicos;

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
const [showConsumo, setShowConsumo] = useState(false);
  const [showAbastecerModal, setShowAbastecerModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
    const [defaultFuel, setDefaultFuel] = useLocalStorage<Fuel>("abastece_default_fuel", "etanol");
  const [fuel, setFuel] = useState<Fuel>(defaultFuel);
  
  // Sincronizar fuel quando defaultFuel mudar no Dropdown
  useEffect(() => {
    setFuel(defaultFuel);
  }, [defaultFuel]);
  const [sortBy, setSortBy] = useState<SortBy>("price");
  const [confirmed, setConfirmed] = useLocalStorage<string[]>("abastece_confirmed_today", []);
  const [disliked, setDisliked] = useLocalStorage<string[]>("abastece_disliked_today", []);
  const [favorites, setFavorites] = useLocalStorage<string[]>("abastece_favorites", []);
  const [showSplash, setShowSplash] = useState(true);
  const [loadingText, setLoadingText] = useState("Carregando...");

  const { isPremium, setIsPremium } = usePremium(userId);

  // ===== FASE 1 — abrir planos =====
  // ===== FASE 2 — abrir tela de assinatura (Abastece+ Pro) =====
  const abrirAssinatura = useCallback(() => {
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/" } });
      return;
    }
    setSection("assinatura");
  }, [user, navigate, setSection]);
  // ===== FIM FASE 2 =====
  // ===== FIM FASE 1 =====

  // planoAtivo: "free" = usuário escolheu o plano grátis (vê prêmios sem resgate);
  // "pro" = usuário assinou via Mercado Pago (vê prêmios completos); null = vê a tela de planos
  const [planoAtivo, setPlanoAtivo] = useState<"free" | "pro" | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [clearedNotifications, setClearedNotifications] = useLocalStorage<string[]>("abastece_cleared_notifications", []);
  // Notificações de boas-vindas já exibidas (evita repetir toda vez que abre o app)
  const [welcomed, setWelcomed] = useLocalStorage<boolean>("abastece_welcomed", false);

    const { vehicle } = useVehicle(userId);

  // Preparar notificações do sino
  const notifications = useMemo(() => {
    const notifs: Array<{ id: string; type: 'points' | 'vehicle' | 'promotion'; title: string; description: string; icon: string; timestamp: string }> = [];
    
    // 0. Boas-vindas — aparece apenas uma vez
    if (!welcomed) {
      notifs.push({
        id: 'welcome-1',
        type: 'promotion',
        title: 'Bem-vindo ao Abastece Votu!',
        description: 'Compare preços, agende serviços e ganhe pontos nos postos de Votuporanga.',
        icon: '👋',
        timestamp: 'Agora',
      });
    }

    // 1. Promoções (Simuladas a partir do AdCarousel)
    if (!isPremium) {
      notifs.push({
        id: 'promo-1',
        type: 'promotion',
        title: 'Troca de óleo com 20% OFF',
        description: 'Agende pelo app — vagas limitadas',
        icon: '🗲️',
        timestamp: 'Hoje',
      });
    }
    
    // 2. Dados do Veículo (Lembretes)
    if (vehicle) {
      const daysLicensing = daysUntil(vehicle.licenciamento_vencimento);
      if (daysLicensing !== null && daysLicensing <= 30) {
        notifs.push({
          id: 'vehicle-licensing',
          type: 'vehicle',
          title: 'Licenciamento Próximo',
          description: `Seu licenciamento vence em ${daysLicensing} dias.`,
          icon: '🚗',
          timestamp: 'Urgente',
        });
      }
      
      const daysInsurance = daysUntil(vehicle.seguro_vencimento);
      if (daysInsurance !== null && daysInsurance <= 15) {
        notifs.push({
          id: 'vehicle-insurance',
          type: 'vehicle',
          title: 'Seguro Vencendo',
          description: `O seguro do seu ${vehicle.modelo} vence em breve.`,
          icon: '🛡️',
          timestamp: 'Atenção',
        });
      }
    }
    
    return notifs.filter(n => !clearedNotifications.includes(n.id));
  }, [vehicle, clearedNotifications, welcomed]);
  // Marcar boas-vindas como vistas quando o painel abre e a notificação de boas-vindas aparece
  useEffect(() => {
    if (showNotifications && !welcomed) {
      setWelcomed(true);
    }
  }, [showNotifications, welcomed, setWelcomed]);

  useEffect(() => {
    if (showSplash) {
      const texts = [
        "Consultando menor preço...",
        "Procurando posto mais próximo...",
        "Verificando promoções...",
        "Sincronizando seus pontos..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % texts.length;
        setLoadingText(texts[i]);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [showSplash]);

  useEffect(() => {
    if (!loading && !authLoading) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 3000); // Aumentado um pouco para dar tempo de ver as frases
      return () => clearTimeout(timer);
    }
  }, [loading, authLoading]);

  const sortedPostos = useMemo(() => {
    if (postos.length === 0) return [];
    const copy = [...postos];
    copy.sort((a, b) => {
      const aFav = favorites.includes(a.name) ? 1 : 0;
      const bFav = favorites.includes(b.name) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return sortBy === "price" 
        ? (a.prices?.[fuel] || 0) - (b.prices?.[fuel] || 0) 
        : (a.distance || 0) - (b.distance || 0);
    });
    return copy;
  }, [fuel, sortBy, postos, favorites]);

  const cheapest = useMemo(() => {
    if (postos.length === 0) return null;
    return [...postos].sort((a, b) => (a.prices?.[fuel] || 0) - (b.prices?.[fuel] || 0))[0];
  }, [postos, fuel]);

  if (loading || authLoading || showSplash) {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center bg-[#0B0F19] p-4 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="relative p-4">
           <img 
              src={logoAbasteceVotu} 
              alt="Abastece Votu Logo" 
              className="h-32 w-auto object-contain select-none"
            />
          </div>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
            <p className="text-sm font-medium text-white/60 animate-pulse">{loadingText}</p>
          </div>
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

  const toggleFavorite = (name: string) => {
    if (favorites.includes(name)) {
      setFavorites(favorites.filter(f => f !== name));
      fireToast("Removido dos favoritos");
    } else {
      setFavorites([...favorites, name]);
      fireToast("Adicionado aos favoritos!");
    }
  };

  const goTo = (s: Section) => {
    setSection(s);
  };

  return (
    <main className={`flex min-h-[100dvh] items-stretch justify-center sm:items-center sm:p-4 transition-colors duration-200 ${
      theme === "dark" ? "bg-[#0f111a] text-white" : "bg-zinc-100 text-zinc-900"
    }`}>
      <InstallButton />
      <div className={`relative flex h-[100dvh] w-full flex-col overflow-hidden sm:h-[860px] transition-colors duration-200 shadow-2xl ${
        theme === "dark" ? "bg-[#0b0f19]" : "bg-white"
      }`}>
        {toast && (
          <div className="absolute top-20 left-1/2 z-[100] -translate-x-1/2 animate-in fade-in slide-in-from-top-4">
            <div className="rounded-full bg-zinc-900/90 px-6 py-2.5 text-sm font-bold text-white shadow-2xl backdrop-blur-md border border-white/10">
              {toast}
            </div>
          </div>
        )}

        <header
          className={`relative z-20 flex items-center justify-between border-b px-4 transition-colors duration-200 ${
            theme === "dark"
              ? "border-white/5 bg-[#121214]/80 backdrop-blur-md"
              : "border-zinc-200 bg-white/95 backdrop-blur-md shadow-sm"
          }`}
          style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
        >
          <div className="flex flex-col py-3.5">
            <h1 className={`text-xl font-black leading-tight ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
              Olá, {displayName ? displayName.split(" ")[0] : "Motorista"}!
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-40">Abastece Votu</p>
          </div>
          <div className="flex items-center gap-1.5 pb-2.5">
            {!isPremium && (
              <button
                onClick={abrirAssinatura}
                aria-label="Assinar Abastece+ Pro"
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-black uppercase tracking-wide transition-transform active:scale-95 bg-yellow-500 text-zinc-900 shadow-[0_2px_12px_rgba(234,179,8,0.35)]`}
              >
                <Crown className="h-4 w-4" />
                <span className="hidden sm:inline">Assinar</span>
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label={showNotifications ? "Fechar notificações" : "Abrir notificações"}
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-transform active:scale-95 ${
                  showNotifications
                    ? theme === "dark" ? "border-emerald-500/30 bg-emerald-500/10" : "border-emerald-200 bg-emerald-50"
                    : theme === "dark" ? "border-white/10 bg-white/5" : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <Bell className={`h-5 w-5 ${showNotifications ? "text-emerald-500" : theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`} />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className={`fixed inset-x-2 top-[calc(env(safe-area-inset-top)+64px)] z-50 sm:static sm:right-0 sm:top-full sm:inset-x-auto mt-0 sm:mt-2 w-auto rounded-2xl border shadow-2xl max-h-96 overflow-y-auto ${
                  theme === "dark" ? "bg-[#161618] border-white/10" : "bg-white border-zinc-200"
                }`}>
                  <div className={`sticky top-0 flex items-center justify-between border-b p-4 ${theme === "dark" ? "border-white/10 bg-[#121214]" : "border-zinc-100 bg-zinc-50"}`}>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">Notificações</h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={() => {
                            setClearedNotifications([...clearedNotifications, ...notifications.map(n => n.id)]);
                            fireToast("Notificações limpas");
                          }}
                          aria-label="Limpar todas as notificações"
                          className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 transition-colors active:opacity-70 px-2 py-1 rounded-lg bg-emerald-500/10"
                        >
                          Limpar tudo
                        </button>
                      )}
                    </div>
                    <button onClick={() => setShowNotifications(false)} aria-label="Fechar painel de notificações" className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground transition-colors active:opacity-70">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-white/5">
                      {notifications.map((notif) => (
                        <div key={notif.id} className={`p-4 transition-colors active:bg-white/5 ${theme === "dark" ? "" : "active:bg-zinc-50"}`}>
                          <div className="flex gap-3">
                            <span className="text-lg">{notif.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold">{notif.title === 'Pontos Ganhos' && notif.description === 'Confirmou preço' ? 'Avaliou posto' : notif.title}</p>
                              <p className="text-xs opacity-60 line-clamp-2">{notif.description === 'Confirmou preço' ? 'Avaliou posto' : notif.description}</p>
                              <p className="text-[10px] opacity-40 mt-1">{notif.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-sm opacity-60">Nenhuma notificação no momento</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="Abrir menu da conta" className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border transition-transform active:scale-95 ${theme === "dark" ? "border-white/10 bg-white/5" : "border-zinc-200 bg-zinc-50"}`}>
                    <User className={`h-5 w-5 ${theme === "dark" ? "text-white" : "text-zinc-600"}`} />
                  </button>
                </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className={`w-72 rounded-[20px] shadow-xl p-0 border overflow-hidden ${theme === "dark" ? "bg-[#0b0f19] border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"}`}>
    
    {/* CARD DE PERFIL COM RESUMO */}
    <div className={`p-4 border-b ${theme === "dark" ? "bg-[#161618] border-white/10" : "bg-zinc-50 border-zinc-200"}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${theme === "dark" ? "bg-emerald-500/20 text-emerald-500" : "bg-emerald-100 text-emerald-600"}`}>
          {displayName ? displayName.charAt(0).toUpperCase() : "U"}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-bold truncate ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
            {displayName || "Usuário Abastece"}
          </h3>
          <p className={`text-xs truncate opacity-60 ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>
            {user?.email}
          </p>
        </div>
        {isPremium && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-bold" title="Premium">
            👑
          </div>
        )}
      </div>
      
      {/* STATUS DO USUÁRIO */}
      <div className="flex gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border flex-1 text-center ${
          isPremium 
            ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" 
            : theme === "dark" 
              ? "bg-white/5 border-white/5 text-zinc-400" 
              : "bg-zinc-100 border-zinc-200 text-zinc-600"
        }`}>
          {isPremium ? "Premium" : "Comum"}
        </span>
      </div>
    </div>

        {/* MENU ITEMS */}
    <div className="p-2">
      <DropdownMenuLabel className="text-[10px] uppercase tracking-widest font-bold px-2 py-1.5 opacity-50">Conta</DropdownMenuLabel>
      
      {/* Meus Dados */}
      <DropdownMenuItem onClick={() => navigate({ to: "/meus-dados" })} className={`flex items-center gap-3 rounded-xl cursor-pointer p-3 transition-colors ${theme === "dark" ? "hover:bg-white/5" : "hover:bg-zinc-100"}`}>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme === "dark" ? "bg-blue-500/10" : "bg-blue-100"}`}>
          <User className={`h-4 w-4 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Meus Dados</p>
          <p className="text-[10px] opacity-60">Editar perfil e informações</p>
        </div>
        <ChevronRight className="h-3.5 w-3.5 opacity-40" />
      </DropdownMenuItem>

      {/* Combustível Padrão */}
      <DropdownMenuItem className={`flex items-center justify-between rounded-xl cursor-pointer p-3 transition-colors ${theme === "dark" ? "hover:bg-white/5" : "hover:bg-zinc-100"}`} onClick={(e) => e.preventDefault()}>
        <div className="flex items-center gap-3 flex-1">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme === "dark" ? "bg-green-500/10" : "bg-green-100"}`}>
            <TrendingUp className={`h-4 w-4 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
          </div>
          <div>
            <p className="text-sm font-bold">Combustível</p>
            <p className="text-[10px] opacity-60">Padrão: {defaultFuel}</p>
          </div>
        </div>
        <select 
          value={defaultFuel} 
          onChange={(e) => {
            setDefaultFuel(e.target.value as Fuel);
          }}
          className={`text-[11px] font-black uppercase bg-transparent border-none focus:ring-0 cursor-pointer appearance-none px-2 py-1 rounded-lg ${theme === "dark" ? "text-emerald-400 bg-white/5" : "text-emerald-600 bg-zinc-100"}`}
        >
          <option value="etanol">Etanol</option>
          <option value="gasolina">Gasolina</option>
          <option value="diesel">Diesel</option>
        </select>
      </DropdownMenuItem>

      {/* Meu Carro */}
      {vehicle && (
        <DropdownMenuItem onClick={() => navigate({ to: "/meus-dados" })} className={`flex items-center gap-3 rounded-xl cursor-pointer p-3 transition-colors ${theme === "dark" ? "hover:bg-white/5" : "hover:bg-zinc-100"}`}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme === "dark" ? "bg-purple-500/10" : "bg-purple-100"}`}>
            <Car className={`h-4 w-4 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">{vehicle.modelo}</p>
            <p className="text-[10px] opacity-60">{vehicle.placa || "Placa não registrada"}</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 opacity-40" />
        </DropdownMenuItem>
      )}

      <DropdownMenuSeparator className={theme === "dark" ? "bg-white/10 my-2" : "bg-zinc-100 my-2"} />
      <DropdownMenuLabel className="text-[10px] uppercase tracking-widest font-bold px-2 py-1.5 opacity-50">Preferências</DropdownMenuLabel>

      {/* Aparência */}
      <DropdownMenuItem onClick={(e) => { e.preventDefault(); toggleTheme(); }} className={`flex items-center justify-between rounded-xl cursor-pointer p-3 transition-colors ${theme === "dark" ? "hover:bg-white/5" : "hover:bg-zinc-100"}`}>
        <div className="flex items-center gap-3 flex-1">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme === "dark" ? "bg-yellow-500/10" : "bg-yellow-100"}`}>
            {theme === "dark" ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
          </div>
          <div>
            <p className="text-sm font-bold">Aparência</p>
            <p className="text-[10px] opacity-60">{theme === "dark" ? "Escuro" : "Claro"}</p>
          </div>
        </div>
        <div className={`w-8 h-4.5 rounded-full p-0.5 flex items-center ${theme === "dark" ? "bg-purple-600 justify-end" : "bg-zinc-300 justify-start"}`}>
          <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md" />
        </div>
      </DropdownMenuItem>

      <DropdownMenuSeparator className={theme === "dark" ? "bg-white/10 my-2" : "bg-zinc-100 my-2"} />

      {/* Sair da Conta */}
      <DropdownMenuItem onClick={async () => { await signOut(); fireToast("Você saiu da conta"); }} className={`flex items-center gap-3 rounded-xl cursor-pointer p-3 transition-colors ${theme === "dark" ? "text-red-400 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"}`}>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme === "dark" ? "bg-red-500/10" : "bg-red-100"}`}>
          <LogOut className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">Sair da Conta</p>
          <p className="text-[10px] opacity-60">Desconectar</p>
        </div>
      </DropdownMenuItem>
    </div>
  </DropdownMenuContent>
</DropdownMenu>
            ) : (
              <button
                onClick={() => navigate({ to: "/login", search: { redirect: "/" } })}
                aria-label="Entrar na conta"
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-black uppercase tracking-wide transition-transform active:scale-95 ${
                  theme === "dark" ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"
                }`}
              >
                <LogIn className="w-4 h-4" /> Entrar
              </button>
            )}
          </div>
        </header>

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
              disliked={disliked}
              favorites={favorites}
onConfirm={(name) => {
	                setConfirmed([...confirmed, name]);
	                fireToast("Obrigado por confirmar o preço!");
	              }}
              onDislike={(name) => {
                setDisliked([...disliked, name]);
                fireToast("Obrigado pelo feedback!");
              }}
              onToggleFavorite={toggleFavorite}
              theme={theme}
              isPremium={isPremium}
            />
          )}

          {section === "carro" && (showConsumo ? (
            <MeuConsumoScreen
              userId={user?.id ?? null}
              vehicle={vehicle}
              onBack={() => setShowConsumo(false)}
              onOpenFuelModal={() => setShowAbastecerModal(true)}
              theme={theme}
            />
          ) : (
            <CarroSection user={user} requireAuth={requireAuth} fireToast={fireToast} theme={theme} isPremium={isPremium} setSection={goTo} onOpenConsumo={() => setShowConsumo(true)} />
          ))}

          {section === "servicos" && (
            <ServicosSection dadosServicos={dadosServicos} loading={loadingServicos} theme={theme} isPremium={isPremium} />
          )}

          {section === "assinatura" && (
            <AssinaturaSection
              userId={userId}
              isPremium={isPremium}
              setIsPremium={setIsPremium}
              requireAuth={requireAuth}
              fireToast={fireToast}
              theme={theme}
              confirmedCount={confirmed.length}
              setSection={goTo}
              setPlanoAtivo={setPlanoAtivo}
            />
          )}
          {section === "premios" && (
            <PlusSection
              userId={userId}
              postos={postos}
              isPremium={isPremium}
              setIsPremium={setIsPremium}
              requireAuth={requireAuth}
              fireToast={fireToast}
              theme={theme}
              confirmedCount={confirmed.length}
              setSection={goTo}
            />
          )}
        </div>

        <nav className={`absolute bottom-0 left-0 z-30 flex h-[70px] w-full items-center justify-around border-t px-2 pb-2 transition-colors duration-200 ${
          theme === "dark" ? "border-white/5 bg-[#0b0f19]/90 backdrop-blur-lg" : "border-zinc-200 bg-white/95 backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
        }`}>
          <NavItem icon={<MapPin className="w-5 h-5" />} label="Postos" active={section === "home"} onClick={() => goTo("home")} theme={theme} />
          <AccessControl requireAuth>
            <NavItem icon={<Car className="w-5 h-5" />} label="Garagem" active={section === "carro"} onClick={() => goTo("carro")} theme={theme} />
          </AccessControl>
          <AccessControl requireAuth>
            <button
              onClick={() => setShowAbastecerModal(true)}
              aria-label="Abastecer"
              className={`flex flex-col items-center justify-center gap-1 w-14 h-full transition-transform active:scale-95 ${theme === "dark" ? "text-white" : "text-zinc-900"}`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_4px_16px_rgba(16,185,129,0.45)]"><Droplets className="w-5 h-5" /></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Abastecer</span>
            </button>
          </AccessControl>
          <NavItem icon={<Wrench className="w-5 h-5" />} label="Serviços" active={section === "servicos"} onClick={() => goTo("servicos")} theme={theme} />
          <AccessControl requireAuth>
            <NavItem 
              icon={
                <div className="relative">
                  <Gift className="w-5 h-5" />
                  {!isPremium && user && (
                    <Crown className="absolute -top-1 -right-1 h-2.5 w-2.5 text-yellow-500" />
                  )}
                </div>
              } 
              label="Prêmios" 
              active={section === "premios"} 
              onClick={() => goTo("premios")} 
              theme={theme}
            />
          </AccessControl>
        </nav>
      </div>
        <AbastecerModal
          open={showAbastecerModal}
          onOpenChange={setShowAbastecerModal}
          userId={user?.id ?? null}
          vehicle={vehicle}
          theme={theme}
          onSuccess={fireToast}
        />
    </main>
  );
}

function NavItem({ icon, label, active, onClick, theme }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; theme: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 w-14 h-full text-[10px] font-bold transition-colors ${
        active ? "text-emerald-500" : theme === "dark" ? "text-muted-foreground hover:text-white" : "text-zinc-400 hover:text-zinc-900"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function HomeSection({
  cheapest, fireToast, sortedPostos, fuel, setFuel, sortBy, setSortBy, confirmed, disliked, favorites, onConfirm, onDislike, onToggleFavorite, theme, isPremium,
}: {
  cheapest: Posto | null;
  fireToast: (m: string) => void;
  sortedPostos: Posto[];
  fuel: Fuel; setFuel: (f: Fuel) => void;
  sortBy: SortBy; setSortBy: (s: SortBy) => void;
  confirmed: string[]; disliked: string[]; favorites: string[]; onConfirm: (name: string) => void; onDislike: (name: string) => void; onToggleFavorite: (name: string) => void;
  theme: string; isPremium: boolean;
}) {
  return (
    <>
      {!isPremium && (
        <section className="mt-1 mb-4 w-full overflow-hidden rounded-2xl border border-white/10 shadow-sm">
          <AdCarousel onAdClick={() => fireToast("Anúncio clicado!")} />
        </section>
      )}

      <PostosSection
        cheapest={cheapest}
        sortedPostos={sortedPostos}
        fuel={fuel}
        setFuel={setFuel}
        sortBy={sortBy}
        setSortBy={setSortBy}
        confirmed={confirmed}
        disliked={disliked}
        favorites={favorites}
        onConfirm={onConfirm}
        onDislike={onDislike}
        onToggleFavorite={onToggleFavorite}
        theme={theme}
        isPremium={isPremium}
        showAds={!isPremium}
      />

    </>
  );
}

function PostRating({ likes = 0, dislikes = 0 }: { likes?: number; dislikes?: number }) {
  const total = likes + dislikes;
  if (total === 0) return <span className="text-[11px] text-muted-foreground italic">Novo</span>;

  const rating = (likes / total) * 5;
  const roundedRating = Math.round(rating * 2) / 2;

  return (
    <div className="flex items-center gap-1">
      <div className="flex text-amber-500">
        {Array.from({ length: 5 }).map((_, index) => {
          const starValue = index + 1;
          if (roundedRating >= starValue) return <Star key={index} size={13} fill="currentColor" />;
          if (roundedRating === starValue - 0.5) return <StarHalf key={index} size={13} fill="currentColor" />;
          return <Star key={index} size={13} className="text-muted-foreground opacity-30" />;
        })}
      </div>
      <span className="text-[11px] font-bold text-muted-foreground ml-0.5">
        {rating.toFixed(1)} <span className="font-normal opacity-70">({total})</span>
      </span>
    </div>
  );
}

function PriceChart({ data, theme }: { data: any[]; theme: string }) {
  return (
    <div className="h-32 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === "dark" ? "#ffffff10" : "#00000010"} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: theme === "dark" ? "#9ca3af" : "#6b7280" }}
          />
          <YAxis hide domain={['dataMin - 0.1', 'dataMax + 0.1']} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff", 
              borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
              borderRadius: '8px',
              fontSize: '12px'
            }}
            itemStyle={{ color: '#10b981' }}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke="#10b981" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function PostosSection({
  cheapest, sortedPostos, fuel, setFuel, sortBy, setSortBy, confirmed, disliked, favorites, onConfirm, onDislike, onToggleFavorite, theme, isPremium, showAds
}: {
  cheapest: Posto | null;
  sortedPostos: Posto[];
  fuel: Fuel; setFuel: (f: Fuel) => void;
  sortBy: SortBy; setSortBy: (s: SortBy) => void;
  confirmed: string[]; disliked: string[]; favorites: string[]; onConfirm: (name: string) => void; onDislike: (name: string) => void; onToggleFavorite: (name: string) => void;
  theme: string; isPremium: boolean; showAds: boolean;
}) {
  const [convPosto, setConvPosto] = useState<Posto | null>(null);
  const [showChart, setShowChart] = useState<string | null>(null);
  const [showComodidades, setShowComodidades] = useState<string | null>(null);

  const fmtPrice = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return "—";
    return val.toFixed(2).replace('.', ',');
  };

  const openGPS = (p: Posto) => {
    const lat = p.lat || -20.4222;
    const lng = p.lng || -49.9733;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 pt-2">
      <div className="mb-5 space-y-3">
        <h3 className={`text-[13px] font-extrabold uppercase tracking-widest pl-1 ${theme === "dark" ? "text-muted-foreground/80" : "text-zinc-500"}`}>
          Lista de Postos
        </h3>
        
        <div className={`flex gap-2 rounded-2xl p-1.5 border ${theme === "dark" ? "bg-[#121214] border-white/5" : "bg-zinc-100 border-zinc-200"}`}>
          {(["etanol", "gasolina", "diesel"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFuel(f)}
              className={`flex-1 rounded-xl py-2 text-[12px] font-bold capitalize transition-all ${
                fuel === f
                  ? theme === "dark" ? "bg-white/10 text-white shadow-md border border-white/10" : "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                  : theme === "dark" ? "text-muted-foreground hover:bg-white/5 hover:text-white" : "text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSortBy("price")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${
              sortBy === "price"
                ? theme === "dark" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm"
                : theme === "dark" ? "border-white/5 bg-[#121214] text-muted-foreground hover:border-white/10 hover:text-white" : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 shadow-sm"
            }`}
          >
            Menor Preço
          </button>
          <button
            onClick={() => setSortBy("distance")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${
              sortBy === "distance"
                ? theme === "dark" ? "border-blue-500/30 bg-blue-500/10 text-blue-400" : "border-blue-200 bg-blue-50 text-blue-600 shadow-sm"
                : theme === "dark" ? "border-white/5 bg-[#121214] text-muted-foreground hover:border-white/10 hover:text-white" : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 shadow-sm"
            }`}
          >
            Mais Próximo
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 backdrop-blur">
          <span className="text-xl">⛽</span>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">{fuel} mais barato</span>
            <strong className={`text-sm font-extrabold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>
              {cheapest?.name || "Buscando..."} {cheapest ? `— R$ ${cheapest.prices[fuel].toFixed(2).replace('.', ',')}` : ""}
            </strong>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sortedPostos.map((p) => {
          const isConfirmed = confirmed.includes(p.name);
          const isDisliked = disliked.includes(p.name);
          const isFavorite = favorites.includes(p.name);
          const precoExibicao = p.prices[fuel] || 0;
          const chartData = useMemo(() => generateHistoryData(precoExibicao), [precoExibicao]);
          
          return (
            <article 
              key={p.name} 
              className={`relative flex flex-col rounded-[22px] border p-4 transition-all ${
                theme === "dark" ? "border-white/10 bg-[#161618] shadow-xl hover:bg-[#1a1a1d]" : "border-zinc-200 bg-white shadow-md hover:shadow-lg"
              } ${isFavorite ? (theme === "dark" ? "ring-1 ring-emerald-500/30" : "ring-1 ring-emerald-500/20") : ""}`}
            >
              {isFavorite && (
                <div className="absolute -top-2 -right-2 z-10 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg">
                  <Heart size={12} fill="currentColor" />
                </div>
              )}

              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`truncate text-base font-bold ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>{p.name}</h4>
                    <button onClick={() => onToggleFavorite(p.name)} className={`transition-colors ${isFavorite ? "text-emerald-500" : "text-zinc-400 hover:text-emerald-500"}`}>
                      <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <p className={`truncate text-[11px] ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}>{p.address}</p>
                  <p className={`mt-0.5 text-[10px] font-semibold opacity-50`}>{p.hours}</p>
                </div>
                
                <div className="flex gap-2">
                  <button onClick={() => openGPS(p)} className={`shrink-0 flex items-center justify-center h-8 w-8 rounded-full transition-all ${theme === "dark" ? "bg-white/5 text-emerald-400 hover:bg-emerald-500/10" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}>
                    <Navigation size={14} />
                  </button>
                  {p.produtos && (
                    <button onClick={() => setConvPosto(p)} className="shrink-0 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500 border border-emerald-500/20">Loja</button>
                  )}
                </div>
              </div>

              <div className="flex items-end justify-between py-2">
                <div>
                  <span className={`block text-[10px] font-bold uppercase tracking-widest mb-0.5 opacity-50`}>Preço {fuel}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-emerald-500">R$</span>
                    <span className={`text-4xl font-black tracking-tighter text-emerald-500`}>{fmtPrice(precoExibicao)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 mb-1">
                  <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border ${theme === "dark" ? "bg-white/5 border-white/5 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-600"}`}>
                    {p.distance || 0} km
                  </span>
                  <button 
                    onClick={() => setShowComodidades(showComodidades === p.name ? null : p.name)}
                    className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${theme === "dark" ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-600 hover:text-emerald-500"}`}
                  >
                    <ChevronDown size={12} className={`transition-transform duration-200 ${showComodidades === p.name ? "rotate-180" : ""}`} />
                    {showComodidades === p.name ? "Menos" : "Ver mais"}
                  </button>
                </div>
              </div>

              {showChart === p.name && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  {isPremium ? (
                    <PriceChart data={chartData} theme={theme} />
                  ) : (
                    <div className={`mt-4 p-4 rounded-2xl border border-dashed flex flex-col items-center text-center gap-2 ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-zinc-50 border-zinc-200"}`}>
                      <Crown size={20} className="text-yellow-500" />
                      <p className="text-[11px] font-bold">Histórico de preços é exclusivo Abastece+ Pro</p>
                      <button className="text-[10px] font-black uppercase text-emerald-500 underline">Assinar agora</button>
                    </div>
                  )}
                </div>
              )}
              {showComodidades === p.name && <PainelComodidades postoId={p.id} theme={theme} />}

              <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-1">
                <div>
                  <span className="mb-1 block text-[10px] uppercase font-semibold tracking-wider opacity-50">Avaliação:</span>
                  <PostRating likes={(p.likes || 0) + (isConfirmed ? 1 : 0)} dislikes={(p.dislikes || 0) + (isDisliked ? 1 : 0)} />
                </div>
                
                <div className="flex items-center gap-2">
                  <AccessControl requireAuth>
                    <button
                      disabled={isConfirmed || isDisliked}
                      onClick={() => onConfirm(p.name)}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                        isConfirmed 
                          ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 scale-105" 
                          : theme === "dark" ? "bg-white/5 border-white/10 hover:bg-emerald-500/10" : "bg-zinc-50 border-zinc-200 hover:bg-emerald-50"
                      }`}
                      title="Avaliar posto (Like)"
                    >👍</button>
                  </AccessControl>
                  <AccessControl requireAuth>
                    <button
                      disabled={isConfirmed || isDisliked}
                      onClick={() => onDislike(p.name)}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                        isDisliked 
                          ? "bg-red-500/20 border-red-500/30 text-red-400 scale-105" 
                          : theme === "dark" ? "bg-white/5 border-white/10 hover:bg-red-500/10" : "bg-zinc-50 border-zinc-200 hover:bg-red-50"
                      }`}
                      title="Preço incorreto (Dislike)"
                    >👎</button>
                  </AccessControl>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Dialog open={!!convPosto} onOpenChange={() => setConvPosto(null)}>
        <DialogContent className={`sm:max-w-[425px] rounded-[32px] p-0 overflow-hidden border-none ${theme === "dark" ? "bg-[#0b0f19] text-white" : "bg-white text-zinc-900"}`}>
          <div className="relative p-6 pb-0">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">{convPosto?.name}</DialogTitle>
              <DialogDescription className="text-xs opacity-60">Produtos disponíveis na loja de conveniência</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 pt-4 space-y-3">
            {convPosto?.produtos?.map((prod, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-2xl border ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-zinc-50 border-zinc-100"}`}>
                <span className="text-sm font-bold">{prod.name}</span>
                <span className="text-sm font-black text-emerald-500">{prod.price}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function PainelComodidades({ postoId, theme }: { postoId: string; theme: string }) {
  const { data: servicos, isLoading } = usePostoServicos(postoId);
  const itens: Array<{ key: "conveniencia" | "gas_cozinha" | "troca_oleo" | "carregador_ev" | "aceita_ticket"; label: string; Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties }> }> = [
    { key: "conveniencia", label: "Conveniência", Icon: ShoppingCart },
    { key: "gas_cozinha", label: "Gás de cozinha", Icon: Flame },
    { key: "troca_oleo", label: "Troca de óleo", Icon: Droplets },
    { key: "carregador_ev", label: "Carregador EV", Icon: Zap },
    { key: "aceita_ticket", label: "Aceita ticket", Icon: Ticket },
  ];
  return (
    <div className={`mt-3 animate-in fade-in slide-in-from-top-2 duration-300 rounded-2xl border p-3 ${theme === "dark" ? "bg-[#121214] border-white/5" : "bg-zinc-50 border-zinc-200"}`}>
      {isLoading ? (
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-7 animate-pulse rounded-lg bg-white/10" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {itens.map(({ key, label, Icon }) => {
            const ativo = Boolean(servicos?.[key]);
            return (
              <div
                key={key}
                title={label}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-all duration-200"
                style={{
                  backgroundColor: ativo
                    ? "rgba(61, 220, 132, 0.12)"
                    : theme === "dark"
                      ? "rgba(107, 114, 128, 0.06)"
                      : "rgba(107, 114, 128, 0.08)",
                }}
              >
                <span style={{ opacity: ativo ? 1 : 0.35, transition: 'opacity 200ms', display: 'inline-flex' }}>
                  <Icon size={14} color={ativo ? "#3ddc84" : "#454f4a"} strokeWidth={2} />
                </span>
                <span
                  className="text-[10px] font-bold tracking-wide"
                  style={{ color: ativo ? "#3ddc84" : (theme === "dark" ? "#6b756f" : "#454f4a"), opacity: ativo ? 1 : 0.55 }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



function ServicosSection({ dadosServicos, loading, theme, isPremium }: { dadosServicos: Servico[]; loading: boolean; theme: string; isPremium: boolean }) {
  const agendarViaWhatsApp = (servico: Servico) => {
    const numero = servico.whatsapp || "5517900000000"; 
    const texto = `Olá! Vi o serviço de *${servico.name}* no App Abastece Votu e gostaria de agendar.`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const servicosOrdenados = useMemo(() => {
    return [...dadosServicos].sort((a, b) => {
      if (a.destaque && !b.destaque) return -1;
      if (!a.destaque && b.destaque) return 1;
      return (b.ordem || 0) - (a.ordem || 0);
    });
  }, [dadosServicos]);

  // Filtro por categoria (rótulos dinâmicos; "Todos" primeiro)
  const [cat, setCat] = useState<string>("todos");
  const categorias = useMemo(() => {
    const set = new Set<string>();
    for (const s of dadosServicos) if (s.categoria) set.add(s.categoria);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [dadosServicos]);
  const servicosFiltrados = useMemo(
    () => (cat === "todos" ? servicosOrdenados : servicosOrdenados.filter((s) => s.categoria === cat)),
    [cat, servicosOrdenados],
  );

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 pt-2">
      {!isPremium && (
        <div className="w-full overflow-hidden rounded-2xl border border-white/10 shadow-sm mb-4">
          <AdCarousel onAdClick={() => {}} />
        </div>
      )}

      <div className="mb-5 space-y-3">
        <div className="flex items-center gap-2 pl-1">
          <Wrench className={`h-4 w-4 ${theme === "dark" ? "text-muted-foreground" : "text-zinc-500"}`} aria-label="" />
          <h3 className={`text-[13px] font-extrabold uppercase tracking-widest ${theme === "dark" ? "text-muted-foreground/80" : "text-zinc-500"}`}>Serviços em Votuporanga</h3>
        </div>

        {categorias.length > 0 && (
          <div className={`flex gap-2 rounded-2xl p-1.5 border ${theme === "dark" ? "bg-[#121214] border-white/5" : "bg-zinc-100 border-zinc-200"}`}>
            {["todos", ...categorias].map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Filtrar serviços por ${c === "todos" ? "todas as categorias" : c}`}
                onClick={() => setCat(c)}
                className={`flex-1 rounded-xl py-2 min-h-[44px] text-[12px] font-bold capitalize transition-all active:scale-[0.97] ${
                  cat === c
                    ? theme === "dark" ? "bg-white/10 text-white shadow-md border border-white/10" : "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                    : theme === "dark" ? "text-muted-foreground active:bg-white/5 active:text-white" : "text-zinc-500 active:bg-zinc-200/60 active:text-zinc-900"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-10" aria-label="Carregando serviços"><Loader2 className="animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-4 pb-20">
          {servicosFiltrados.length === 0 && !loading && (
            <div className={`rounded-[22px] border p-8 text-center ${theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white"}`}>
              <p className={`text-sm font-bold ${theme === "dark" ? "text-muted-foreground" : "text-zinc-500"}`}>Nenhum serviço {cat !== "todos" ? `na categoria "${cat}"` : ""} encontrado.</p>
            </div>
          )}
          {servicosFiltrados.map((s, i) => (
            <div key={i} role="article" aria-label={`Serviço: ${s.name}`} className={`relative overflow-hidden rounded-[22px] border p-5 transition-all ${theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white shadow-md"}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`truncate text-lg font-black tracking-tight ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>{s.name}</h4>
                    {s.destaque && <span className="bg-yellow-500/20 text-yellow-500 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Destaque</span>}
                  </div>
                  {s.categoria && <p className={`text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-white/50" : "text-zinc-500"}`}>{s.categoria}</p>}
                  {s.empresa_nome && <p className="text-[11px] opacity-60 font-bold uppercase tracking-wider text-emerald-500">{s.empresa_nome}</p>}
                </div>
                {s.price && (
                  <div className="text-right shrink-0 ml-3">
                    <span className="text-xl font-black text-emerald-500">{s.price}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-white/5">
                {s.address && (
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-3 h-3 shrink-0 opacity-40" aria-hidden="true" />
                    <span className="text-[11px] opacity-60 truncate max-w-[150px]">{s.address}</span>
                  </div>
                )}
                <div className="flex-1" />
                <Button
                  type="button"
                  onClick={() => agendarViaWhatsApp(s)}
                  aria-label={`Agendar ${s.name} via WhatsApp`}
                  className="min-h-[44px] rounded-full bg-emerald-500 text-white font-bold text-xs px-6 transition-transform active:scale-[0.97] hover:bg-emerald-600"
                >
                  Agendar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CarroSection({ user, requireAuth, fireToast, theme, isPremium, setSection, onOpenConsumo, showFuelModal, setShowFuelModal }: { user: any; requireAuth: any; fireToast: any; theme: string; isPremium: boolean; onOpenConsumo: () => void;   setSection: (s: Section) => void; showFuelModal?: boolean; setShowFuelModal?: (v: boolean) => void }) {
  const { vehicle, save } = useVehicle(user?.id ?? null);
  const [form, setForm] = useState({ marca: "", modelo: "", ano: "", placa: "", licenciamento_vencimento: "", seguro_vencimento: "", km_atual: "" });
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
        km_atual: vehicle.km_atual?.toString() ?? ""
      });
      if (vehicle.marca && vehicle.modelo) setIsExpanded(false);
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
        km_atual: form.km_atual ? parseInt(form.km_atual, 10) : null
      });
      fireToast("Veículo salvo com sucesso!");
      setIsExpanded(false);
    } catch { fireToast("Erro ao salvar o veículo"); }
  };



  const licDays = daysUntil(form.licenciamento_vencimento);
  const segDays = daysUntil(form.seguro_vencimento);
  const hasVehicle = Boolean(form.marca && form.modelo);

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 space-y-4 pt-2">
      {!isPremium && (
        <div className="w-full overflow-hidden rounded-2xl border border-white/10 shadow-sm mb-4">
          <AdCarousel onAdClick={() => {}} />
        </div>
      )}
      
      <div className="flex items-center gap-2 mb-4">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-lg shadow-inner ${theme === "dark" ? "bg-white/10" : "bg-zinc-100"}`}>🚗</span>
        <h3 className={`text-[13px] font-extrabold uppercase tracking-widest ${theme === "dark" ? "text-muted-foreground/80" : "text-zinc-500"}`}>Garagem</h3>
      </div>
      
      {(licDays !== null && licDays <= 30) && <Alert tone={licDays < 0 ? "danger" : "warn"} title={licDays < 0 ? "Licenciamento vencido" : `Licenciamento vence em ${licDays} dias`} />}
      {(segDays !== null && segDays <= 30) && <Alert tone={segDays < 0 ? "danger" : "warn"} title={segDays < 0 ? "Seguro vencido" : `Seguro vence em ${segDays} dias`} />}
      
      {!isExpanded && hasVehicle ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            aria-label="Editar veículo principal"
            className={`group flex min-h-[44px] w-full items-center justify-between rounded-[22px] border p-5 text-left transition-all active:scale-[0.98] ${theme === "dark" ? "border-white/10 bg-[#161618] active:bg-[#1a1a1d]" : "border-zinc-200 bg-white shadow-md active:bg-zinc-50"}`}
          >
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-widest opacity-50">Veículo Principal</span>
              <h4 className={`mt-1 text-xl font-black tracking-tight ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>{form.marca} {form.modelo}</h4>
              <div className="flex flex-wrap gap-2 mt-2.5">
                {form.placa && <div className={`inline-block rounded-lg border px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-widest ${theme === "dark" ? "border-white/10 bg-white/5 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-800"}`}>{form.placa}</div>}
                {form.km_atual && <div className={`inline-block rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${theme === "dark" ? "border-white/10 bg-white/5 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-800"}`}>{form.km_atual} KM</div>}
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 transition-transform group-active:scale-95">
              <Pencil className="h-4 w-4" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onOpenConsumo()}
            aria-label="Abrir meu consumo"
            className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[22px] border px-4 transition-all active:scale-[0.98] ${theme === "dark" ? "bg-blue-500/10 border-blue-500/20 text-blue-400 active:bg-blue-500/20" : "bg-blue-50 border-blue-100 text-blue-600 active:bg-blue-100"}`}
          >
            <BarChart3 size={20} />
            <span className="text-[11px] font-black uppercase tracking-widest">Consumo</span>
          </button>
        </div>
      ) : (
        <form onSubmit={onSave} className={`relative rounded-[22px] border p-5 ${theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white shadow-lg"}`}>
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-emerald-500">{hasVehicle ? "Editar Veículo" : "Novo Veículo"}</h4>
            {hasVehicle && <button type="button" onClick={() => setIsExpanded(false)} aria-label="Cancelar edição" className="min-h-[44px] flex items-center rounded-lg px-3 text-[10px] font-bold uppercase opacity-50 transition-colors active:opacity-80">✕ Cancelar</button>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca"><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className={theme === "dark" ? "bg-[#121214] border-white/10" : "bg-zinc-50 border-zinc-200"} /></Field>
            <Field label="Modelo"><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} className={theme === "dark" ? "bg-[#121214] border-white/10" : "bg-zinc-50 border-zinc-200"} /></Field>
            <Field label="Ano"><Input value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} className={theme === "dark" ? "bg-[#121214] border-white/10" : "bg-zinc-50 border-zinc-200"} /></Field>
            <Field label="Placa"><Input value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })} className={theme === "dark" ? "bg-[#121214] border-white/10" : "bg-zinc-50 border-zinc-200"} /></Field>
            <Field label="KM Atual"><Input value={form.km_atual} onChange={(e) => setForm({ ...form, km_atual: e.target.value })} className={theme === "dark" ? "bg-[#121214] border-white/10" : "bg-zinc-50 border-zinc-200"} /></Field>
            <Field label="Venc. Seguro"><Input type="date" value={form.seguro_vencimento} onChange={(e) => setForm({ ...form, seguro_vencimento: e.target.value })} className={theme === "dark" ? "bg-[#121214] border-white/10" : "bg-zinc-50 border-zinc-200"} /></Field>
            <div className="col-span-2">
              <Field label="Venc. Licenciamento"><Input type="date" value={form.licenciamento_vencimento} onChange={(e) => setForm({ ...form, licenciamento_vencimento: e.target.value })} className={theme === "dark" ? "bg-[#121214] border-white/10" : "bg-zinc-50 border-zinc-200"} /></Field>
            </div>
          </div>
          <Button type="submit" className="mt-5 w-full rounded-[14px] bg-emerald-500 py-3 min-h-[44px] font-bold text-white transition-transform active:scale-[0.98] hover:bg-emerald-600">Salvar na Garagem</Button>
        </form>
      )}

        



      <div className="mt-8 space-y-4 pt-2 border-t border-zinc-500/10">
        <h3 className={`text-[13px] font-extrabold uppercase tracking-widest pl-1 mb-3 ${theme === "dark" ? "text-muted-foreground/80" : "text-zinc-500"}`}>Calculadoras Inteligentes</h3>
        <div className={`overflow-hidden rounded-[22px] border p-1 ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white"}`}><FlexCalculator theme={theme} /></div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-[11px] font-semibold opacity-50">{label}</Label>{children}</div>;
}

function Alert({ tone, title }: { tone: "warn" | "danger"; title: string }) {
  const cls = tone === "danger" ? "border-red-500/40 bg-red-500/10 text-red-500" : "border-yellow-500/40 bg-yellow-500/10 text-yellow-600";
  return <div role="alert" className={`flex min-h-[44px] items-center gap-3 rounded-xl border px-3 py-2.5 text-xs font-semibold ${cls}`}><AlertTriangle className="h-4 w-4 shrink-0" /><span>{title}</span></div>;
}

function FlexCalculator({ theme }: { theme: string }) {
  const [e, setE] = useState(""); const [g, setG] = useState("");
  const result = useMemo(() => {
    const ev = parseFloat(e.replace(",", ".")); const gv = parseFloat(g.replace(",", "."));
    if (!ev || !gv) return null;
    const ratio = ev / gv;
    return ratio <= 0.7 ? { winner: "Etanol compensa", pct: (ratio * 100).toFixed(0), good: true } : { winner: "Gasolina compensa", pct: (ratio * 100).toFixed(0), good: false };
  }, [e, g]);
  return (
    <div className={`space-y-3 rounded-2xl p-4 border ${theme === "dark" ? "bg-[#161618] border-white/5" : "bg-white border-zinc-100 shadow-sm"}`}>
      <h4 className="text-xs font-bold uppercase tracking-wider opacity-50">Calculadora Flex</h4>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Etanol (R$)"><Input value={e} onChange={(ev) => setE(ev.target.value)} placeholder="3,27" inputMode="decimal" className={theme === "dark" ? "bg-[#121214] border-white/10" : "bg-zinc-50 border-zinc-200"} /></Field>
        <Field label="Gasolina (R$)"><Input value={g} onChange={(ev) => setG(ev.target.value)} placeholder="5,49" inputMode="decimal" className={theme === "dark" ? "bg-[#121214] border-white/10" : "bg-zinc-50 border-zinc-200"} /></Field>
      </div>
      {result && <div className={`rounded-lg px-3 py-2 text-sm font-bold ${result.good ? "bg-emerald-500/20 text-emerald-500" : "bg-indigo-500/20 text-indigo-400"}`}>{result.winner} ({result.pct}% da gasolina)</div>}
    </div>
  );
}


function PlanosSection({ userId, setIsPremium, fireToast, theme, setPlanoAtivo }: { userId: string | null; setIsPremium: any; fireToast: any; theme: string; setPlanoAtivo: (p: "free" | "pro") => void }) {
  const subscribe = async () => {
    if (!userId) return fireToast("Faça login para assinar");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return fireToast("Sessão expirada. Faça login novamente.");
      const { data, error } = await supabase.functions.invoke("create-subscription", {
        body: {},
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error || !data?.init_point) {
        console.error("Erro ao criar assinatura:", error ?? data);
        return fireToast("Falha ao iniciar a assinatura. Tente novamente.");
      }
      fireToast("Abrindo o pagamento no Mercado Pago...");
      window.location.href = data.init_point;
    } catch {
      fireToast("Falha ao iniciar a assinatura. Tente novamente.");
    }
  };
  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 space-y-6 pt-2 pb-20">
      <div className="text-center space-y-2">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-xl text-white"><Crown className="h-10 w-10" /></div>
        <h2 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>Abastece+ Pro</h2>
        <p className="text-sm opacity-60">O clube de benefícios exclusivo para motoristas de Votuporanga.</p>
      </div>

      {/* Comparação de Planos */}
      <div className="space-y-4 mt-8">
        <h3 className={`text-[13px] font-extrabold uppercase tracking-widest pl-1 ${theme === "dark" ? "text-muted-foreground/80" : "text-zinc-500"}`}>Escolha seu Plano</h3>
        
        {/* Plano Comunidade (Grátis) */}
        <div className={`rounded-[22px] border p-6 space-y-4 ${theme === "dark" ? "bg-[#161618] border-white/10" : "bg-white border-zinc-200 shadow-sm"}`}>
          <div>
            <h4 className="text-lg font-bold">Comunidade</h4>
            <p className={`text-[11px] font-semibold opacity-60 mt-1`}>Para quem quer apenas consultar os preços da cidade.</p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-emerald-500">R$ 0</span>
            <span className="text-xs opacity-60">/sempre</span>
          </div>
          <ul className="space-y-2.5">
            <li className="flex items-center gap-2 text-[12px]">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Lista de postos atualizada</span>
            </li>
            <li className="flex items-center gap-2 text-[12px]">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Mapa interativo de Votuporanga</span>
            </li>
            <li className="flex items-center gap-2 text-[12px]">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Histórico básico de preços</span>
            </li>
            <li className="flex items-center gap-2 text-[12px] opacity-50 line-through">
              <span className="text-red-500 font-bold">×</span>
              <span>Resgate de Prêmios</span>
            </li>
            <li className="flex items-center gap-2 text-[12px] opacity-50 line-through">
              <span className="text-red-500 font-bold">×</span>
              <span>Sem Anúncios no App</span>
            </li>
            <li className="flex items-center gap-2 text-[12px] opacity-50 line-through">
              <span className="text-red-500 font-bold">×</span>
              <span>Alertas em Tempo Real</span>
            </li>
          </ul>
        </div>

        {/* Plano Abastece+ Pro */}
        <div className={`rounded-[22px] border-2 border-yellow-500/30 p-6 space-y-4 relative overflow-hidden ${theme === "dark" ? "bg-yellow-500/5" : "bg-yellow-50"}`}>
          <div className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 to-amber-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase">Mais Assinado</div>
          <div>
            <h4 className="text-lg font-bold">Abastece+ Pro</h4>
            <p className={`text-[11px] font-semibold opacity-60 mt-1`}>A experiência definitiva com máxima economia e benefícios exclusivos.</p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold">R$</span>
            <span className="text-4xl font-black text-yellow-500">9,90</span>
            <span className="text-xs opacity-60">/mês</span>
          </div>
          <ul className="space-y-2.5">
            <li className="flex items-center gap-2 text-[12px] font-bold">
              <span className="text-emerald-500">✓</span>
              <span>Resgate de Prêmios Exclusivos</span>
            </li>
            <li className="flex items-center gap-2 text-[12px] font-bold">
              <span className="text-emerald-500">✓</span>
              <span>Navegação Sem Anúncios</span>
            </li>
            <li className="flex items-center gap-2 text-[12px]">
              <span className="text-emerald-500">✓</span>
              <span>Alertas em tempo real quando o preço cair</span>
            </li>
            <li className="flex items-center gap-2 text-[12px]">
              <span className="text-emerald-500">✓</span>
              <span>Cashback e vantagens em postos parceiros</span>
            </li>
            <li className="flex items-center gap-2 text-[12px]">
              <span className="text-emerald-500">✓</span>
              <span>Gráficos de tendência e previsão de preços</span>
            </li>
            <li className="flex items-center gap-2 text-[12px]">
              <span className="text-emerald-500">✓</span>
              <span>Suporte prioritário 24/7</span>
            </li>
          </ul>
          <Button onClick={subscribe} className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-zinc-900 font-black rounded-xl mt-4">ASSINAR ABASTECE + PRO</Button>
          <p className="text-[10px] opacity-50 text-center">Cancele quando quiser. Sem fidelidade.</p>
        </div>
      </div>
    </section>
  );
}



function AssinaturaSection({ userId, isPremium, setIsPremium, requireAuth, fireToast, theme, confirmedCount, setSection, setPlanoAtivo }: { userId: string | null; isPremium: boolean; setIsPremium: any; requireAuth: any; fireToast: any; theme: string; confirmedCount: number; setSection: (s: Section) => void; setPlanoAtivo: (p: "free" | "pro") => void }) {
  const subscribe = async () => {
    if (!userId) return fireToast("Faça login para assinar");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return fireToast("Sessão expirada. Faça login novamente.");
      const { data, error } = await supabase.functions.invoke("create-subscription", {
        body: {},
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error || !data?.init_point) {
        console.error("Erro ao criar assinatura:", error ?? data);
        return fireToast("Falha ao iniciar a assinatura. Tente novamente.");
      }
      fireToast("Abrindo o pagamento no Mercado Pago...");
      window.location.href = data.init_point;
    } catch {
      fireToast("Falha ao iniciar a assinatura. Tente novamente.");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 pt-2 pb-20">
      <div className="text-center space-y-2">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-xl text-white"><Crown className="h-10 w-10" /></div>
        <h2 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>Abastece+ Pro</h2>
        <p className="text-sm opacity-60">O clube de benefícios exclusivo para motoristas de Votuporanga.</p>
      </div>
      {/* Card dos planos com o overlay "Em breve" cobrindo apenas esta área */}
      <div className={`relative rounded-[22px] border overflow-hidden ${theme === "dark" ? "bg-[#161618] border-white/10" : "bg-white border-zinc-200 shadow-sm"}`}>
        <ComingSoonOverlay 
          title="Em breve: Abastece+" 
          description="Estamos preparando prêmios exclusivos para você. O resgate de pontos e o clube de benefícios estarão disponíveis em breve!"
        />
        <div className="p-6 space-y-4 opacity-40 grayscale pointer-events-none">
          {/* Plano Comunidade (Grátis) */}
          <div className={`rounded-[22px] border p-6 space-y-4 ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-zinc-50 border-zinc-200"}`}>
            <div>
              <h4 className="text-lg font-bold">Comunidade</h4>
              <p className={`text-[11px] font-semibold opacity-60 mt-1`}>Para quem quer apenas consultar os preços da cidade.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-emerald-500">R$ 0</span>
              <span className="text-xs opacity-60">/sempre</span>
            </div>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2 text-[12px]">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Lista de postos atualizada</span>
              </li>
              <li className="flex items-center gap-2 text-[12px]">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Mapa interativo de Votuporanga</span>
              </li>
              <li className="flex items-center gap-2 text-[12px]">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>Histórico básico de preços</span>
              </li>
              <li className="flex items-center gap-2 text-[12px] opacity-50 line-through">
                <span className="text-red-500 font-bold">×</span>
                <span>Resgate de Prêmios</span>
              </li>
              <li className="flex items-center gap-2 text-[12px] opacity-50 line-through">
                <span className="text-red-500 font-bold">×</span>
                <span>Sem Anúncios no App</span>
              </li>
              <li className="flex items-center gap-2 text-[12px] opacity-50 line-through">
                <span className="text-red-500 font-bold">×</span>
                <span>Alertas em Tempo Real</span>
              </li>
            </ul>
            <Button onClick={() => setPlanoAtivo("free")} className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl mt-4">COMEÇAR GRÁTIS</Button>
          </div>

          {/* Plano Abastece+ Pro */}
          <div className={`rounded-[22px] border-2 border-yellow-500/30 p-6 space-y-4 relative overflow-hidden ${theme === "dark" ? "bg-yellow-500/5" : "bg-yellow-50"}`}>
            <div className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 to-amber-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase">Mais Assinado</div>
            <div>
              <h4 className="text-lg font-bold">Abastece+ Pro</h4>
              <p className={`text-[11px] font-semibold opacity-60 mt-1`}>A experiência definitiva com máxima economia e benefícios exclusivos.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold">R$</span>
              <span className="text-4xl font-black text-yellow-500">9,90</span>
              <span className="text-xs opacity-60">/mês</span>
            </div>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2 text-[12px] font-bold">
                <span className="text-emerald-500">✓</span>
                <span>Resgate de Prêmios Exclusivos</span>
              </li>
              <li className="flex items-center gap-2 text-[12px] font-bold">
                <span className="text-emerald-500">✓</span>
                <span>Navegação Sem Anúncios</span>
              </li>
              <li className="flex items-center gap-2 text-[12px]">
                <span className="text-emerald-500">✓</span>
                <span>Alertas em tempo real quando o preço cair</span>
              </li>
              <li className="flex items-center gap-2 text-[12px]">
                <span className="text-emerald-500">✓</span>
                <span>Cashback e vantagens em postos parceiros</span>
              </li>
              <li className="flex items-center gap-2 text-[12px]">
                <span className="text-emerald-500">✓</span>
                <span>Gráficos de tendência e previsão de preços</span>
              </li>
              <li className="flex items-center gap-2 text-[12px]">
                <span className="text-emerald-500">✓</span>
                <span>Suporte prioritário 24/7</span>
              </li>
            </ul>
            <Button onClick={subscribe} className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-zinc-900 font-black rounded-xl mt-4">ASSINAR ABASTECE + PRO</Button>
            <p className="text-[10px] opacity-50 text-center">Cancele quando quiser. Sem fidelidade.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
function PlusSection({ userId, postos, isPremium, setIsPremium, requireAuth, fireToast, theme, confirmedCount, setSection }: { userId: string | null; postos: Posto[]; isPremium: boolean; setIsPremium: any; requireAuth: any; fireToast: any; theme: string; confirmedCount: number; setSection: (s: Section) => void }) {
  const [showLock, setShowLock] = useState(false);
  const [postoSelecionadoId, setPostoSelecionadoId] = useState<string | null>(null);

  // Sem estado de "posto selecionado" em nenhum outro lugar do app — escolhe o
  // primeiro posto ao carregar e deixa o usuário trocar pelos chips abaixo.
  useEffect(() => {
    if (!postoSelecionadoId && postos.length > 0) {
      setPostoSelecionadoId(postos[0].id);
    }
  }, [postos, postoSelecionadoId]);

  const { data: premios = [], isLoading: loadingPremios } = usePremiosPorPosto(postoSelecionadoId);
  const { data: saldoPosto = 0, isLoading: loadingSaldo, refetch: refetchSaldo } = useSaldoPorPosto(userId, postoSelecionadoId);

  const abrirPremioBloqueado = () => {
    if (!userId) return requireAuth(() => {});
    setShowLock(true);
  };

  // Fluxo de resgate: confirmar -> chamar criar-codigo-pontos -> mostrar código + contagem
  const [premioConfirmar, setPremioConfirmar] = useState<Premio | null>(null);
  const [gerandoCodigo, setGerandoCodigo] = useState(false);
  const [erroConfirmar, setErroConfirmar] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ codigo: string; expiraEm: string; quantidadePontos: number; premioNome: string } | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState(0);

  useEffect(() => {
    if (!resultado) return;
    const calcularRestante = () => Math.max(0, Math.floor((new Date(resultado.expiraEm).getTime() - Date.now()) / 1000));
    setSegundosRestantes(calcularRestante());
    const interval = setInterval(() => setSegundosRestantes(calcularRestante()), 1000);
    return () => clearInterval(interval);
  }, [resultado]);

  const abrirConfirmacao = (p: Premio) => {
    if (!userId) return requireAuth(() => {});
    setErroConfirmar(null);
    setPremioConfirmar(p);
  };

  const mensagemErroResgate = (raw: string): string => {
    const texto = raw.toLowerCase();
    if (texto.includes("saldo")) return "Saldo insuficiente para este prêmio.";
    if (texto.includes("exclusivo")) return "Este prêmio é exclusivo para assinantes Abastece+ Pro.";
    if (texto.includes("indispon") || texto.includes("invalido") || texto.includes("inválido")) return "Este prêmio não está mais disponível.";
    if (texto.includes("autenticado") || texto.includes("token")) return "Sua sessão expirou. Faça login novamente.";
    return "Não foi possível gerar o código agora. Tente novamente.";
  };

  const confirmarResgate = async () => {
    if (!premioConfirmar || !postoSelecionadoId) return;
    setGerandoCodigo(true);
    setErroConfirmar(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setErroConfirmar("Sua sessão expirou. Faça login novamente.");
        setGerandoCodigo(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("criar-codigo-pontos", {
        body: { tipo: "resgate", posto_id: postoSelecionadoId, premio_id: premioConfirmar.id },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) {
        let msg = "Não foi possível gerar o código agora. Tente novamente.";
        if (error instanceof FunctionsHttpError) {
          try {
            const body = await error.context.json();
            if (body?.error) msg = mensagemErroResgate(String(body.error));
          } catch {
            // mantém mensagem genérica se o corpo não vier em JSON
          }
        }
        setErroConfirmar(msg);
        return;
      }

      const payload = data as { codigo: string; expira_em: string; quantidade_pontos: number };
      setResultado({
        codigo: payload.codigo,
        expiraEm: payload.expira_em,
        quantidadePontos: payload.quantidade_pontos,
        premioNome: premioConfirmar.nome,
      });
      setPremioConfirmar(null);
      refetchSaldo();
    } catch {
      setErroConfirmar("Não foi possível gerar o código agora. Tente novamente.");
    } finally {
      setGerandoCodigo(false);
    }
  };

  const mm = String(Math.floor(segundosRestantes / 60)).padStart(2, "0");
  const ss = String(segundosRestantes % 60).padStart(2, "0");

  // Melhora 4.1: Sistema de Conquistas (Badges)
  const badges = [
    { id: 1, name: "Sentinela", icon: <ShieldCheck size={20} />, desc: "Validou 5 preços", goal: 5, current: confirmedCount },
    { id: 2, name: "Explorador", icon: <MapPin size={20} />, desc: "Visitou 3 postos", goal: 3, current: Math.min(confirmedCount, 3) },
    { id: 3, name: "VIP", icon: <Trophy size={20} />, desc: "Membro Abastece+", goal: 1, current: isPremium ? 1 : 0 },
  ];

  return (
    // TEMP "em breve": catálogo de prêmios ainda sem itens cadastrados. Cobrindo a
    // tela inteira com o mesmo ComingSoonOverlay já usado na tela de assinatura
    // (AssinaturaSection, neste arquivo). Os hooks acima (usePremiosPorPosto,
    // useSaldoPorPosto, fluxo de criar-codigo-pontos) continuam ativos normalmente —
    // só a UI real fica oculta (className="hidden") abaixo do overlay. Quando o
    // catálogo for populado: remover o <ComingSoonOverlay> e a <div className="hidden">
    // (mantendo o conteúdo interno dela), voltando o <section> para
    // className="animate-in fade-in slide-in-from-bottom-4 space-y-6 pt-2 pb-20".
    <section className="relative min-h-[70vh]">
      <ComingSoonOverlay
        title="Em breve: Prêmios"
        description="Estamos preparando o catálogo de prêmios para você. Fique atento ao lançamento em breve!"
      />
      <div className="hidden" aria-hidden="true">
      <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 pt-2 pb-20">
      <div className={`relative overflow-hidden rounded-[22px] border shadow-xl p-5 transition-all ${theme === "dark" ? "border-white/10 bg-gradient-to-br from-emerald-600 to-emerald-900 text-white" : "border-zinc-200 bg-zinc-900 text-white"}`}>
        <div className="flex items-center justify-between">
          <div><span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Saldo Disponível</span><div className="flex items-baseline gap-2 mt-1"><span className="text-4xl font-black tracking-tighter">{loadingSaldo ? "—" : saldoPosto}</span><span className="text-sm font-bold opacity-80">pontos</span></div></div>
          <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10"><Crown className="h-6 w-6 text-yellow-400" /></div>
        </div>
      </div>

      {/* Melhora 4.1: Seção de Conquistas */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4 pl-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/10 text-lg shadow-inner">🏆</span>
          <h3 className={`text-[13px] font-extrabold uppercase tracking-widest ${theme === "dark" ? "text-muted-foreground/80" : "text-zinc-500"}`}>Minhas Conquistas</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {badges.map((b) => {
            const isDone = b.current >= b.goal;
            return (
              <div key={b.id} className={`shrink-0 flex flex-col items-center gap-2 p-4 rounded-2xl border w-32 transition-all ${isDone ? (theme === "dark" ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500" : "bg-yellow-50 border-yellow-200 text-yellow-600") : "opacity-40 grayscale"}`}>
                <div className={`p-3 rounded-full ${isDone ? "bg-yellow-500/20" : "bg-zinc-500/10"}`}>{b.icon}</div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-tighter">{b.name}</p>
                  <p className="text-[8px] font-bold opacity-60 mt-0.5">{b.current}/{b.goal}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4 pl-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-lg shadow-inner">🎁</span>
          <h3 className={`text-[13px] font-extrabold uppercase tracking-widest ${theme === "dark" ? "text-muted-foreground/80" : "text-zinc-500"}`}>Prêmios Disponíveis</h3>
        </div>

        {postos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
            {postos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPostoSelecionadoId(p.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  postoSelecionadoId === p.id
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                    : theme === "dark" ? "border-white/10 text-white/60" : "border-zinc-200 text-zinc-500"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {loadingPremios ? (
          <p className="py-6 text-center text-[11px] opacity-50">Carregando prêmios...</p>
        ) : premios.length === 0 ? (
          <p className="py-6 text-center text-[11px] opacity-50">Nenhum prêmio disponível neste posto no momento.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {premios.map((p) => {
              const bloqueadoPro = p.exclusivo_premium && !isPremium;
              const disponivel = !bloqueadoPro && saldoPosto >= p.pontos_necessarios;
              const insuficiente = !bloqueadoPro && !disponivel;
              return (
                <div
                  key={p.id}
                  onClick={bloqueadoPro ? abrirPremioBloqueado : disponivel ? () => abrirConfirmacao(p) : undefined}
                  role={bloqueadoPro || disponivel ? "button" : undefined}
                  tabIndex={bloqueadoPro || disponivel ? 0 : undefined}
                  aria-label={
                    bloqueadoPro
                      ? `${p.nome}, exclusivo para assinantes Abastece+ Pro`
                      : disponivel
                        ? `${p.nome}, custa ${p.pontos_necessarios} pontos, disponível`
                        : `${p.nome}, custa ${p.pontos_necessarios} pontos, pontos insuficientes`
                  }
                  className={`group relative flex min-h-[110px] flex-col gap-2 rounded-[22px] border p-4 shadow-xl transition-all duration-300 ${
                    bloqueadoPro || disponivel ? "cursor-pointer hover:shadow-2xl hover:border-emerald-500/30" : insuficiente ? "opacity-50" : ""
                  } ${theme === "dark" ? "bg-[#161618] border-white/10" : "bg-white border-zinc-200"}`}
                >
                  {bloqueadoPro && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-yellow-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-yellow-500">
                      <Crown className="h-3 w-3" aria-hidden /> Pro
                    </span>
                  )}
                  <h4 className="text-[13px] font-bold leading-tight mb-1 pr-10">{p.nome}</h4>
                  <span className={`mt-auto inline-flex items-center justify-between gap-1 text-xs font-bold ${
                    bloqueadoPro ? "text-yellow-500" : disponivel ? "text-emerald-500" : theme === "dark" ? "text-white/40" : "text-zinc-400"
                  }`}>
                    <span className="inline-flex items-center gap-1">
                      <Zap className="h-3 w-3" aria-hidden /> {p.pontos_necessarios} pontos
                    </span>
                    {insuficiente && (
                      <span className="inline-flex items-center gap-1" aria-hidden>
                        <Lock className="h-3 w-3" /> Falta {p.pontos_necessarios - saldoPosto}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showLock} onOpenChange={setShowLock}>
        <DialogContent className={`rounded-[32px] border-none ${theme === "dark" ? "bg-[#0b0f19] text-white" : "bg-white text-zinc-900"}`}>
          <div className="text-center p-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500"><Crown className="h-8 w-8" /></div>
            <DialogHeader><DialogTitle className="text-xl font-black">Área Exclusiva</DialogTitle><DialogDescription className="opacity-60">O resgate de prêmios está disponível apenas para membros do clube Abastece+ Pro.</DialogDescription></DialogHeader>
                        <Button onClick={() => { setShowLock(false); setSection("assinatura"); }} className="mt-6 w-full rounded-xl bg-yellow-500 hover:bg-yellow-600 font-bold text-white">FECHAR</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!premioConfirmar} onOpenChange={(open) => { if (!open) { setPremioConfirmar(null); setErroConfirmar(null); } }}>
        <DialogContent className={`rounded-[32px] border-none ${theme === "dark" ? "bg-[#0b0f19] text-white" : "bg-white text-zinc-900"}`}>
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"><Zap className="h-8 w-8" /></div>
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Confirmar Resgate?</DialogTitle>
              <DialogDescription className="opacity-60">Você usará {premioConfirmar?.pontos_necessarios} pontos para resgatar: {premioConfirmar?.nome}</DialogDescription>
            </DialogHeader>
            {erroConfirmar && (
              <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-400">{erroConfirmar}</p>
            )}
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => { setPremioConfirmar(null); setErroConfirmar(null); }} disabled={gerandoCodigo} className="flex-1 rounded-xl">Cancelar</Button>
              <Button onClick={confirmarResgate} disabled={gerandoCodigo} className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-white">
                {gerandoCodigo ? "Gerando..." : "Resgatar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resultado} onOpenChange={(open) => { if (!open) setResultado(null); }}>
        <DialogContent className={`rounded-[32px] border-none ${theme === "dark" ? "bg-[#0b0f19] text-white" : "bg-white text-zinc-900"}`}>
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">🎉</div>
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Resgate Confirmado!</DialogTitle>
              <DialogDescription className="opacity-60">Apresente o código abaixo no caixa do posto para retirar: {resultado?.premioNome}</DialogDescription>
            </DialogHeader>
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <span className="text-3xl font-black tracking-[0.3em] text-emerald-500">{resultado?.codigo}</span>
            </div>
            <p className={`mt-3 text-xs font-bold ${segundosRestantes > 0 ? "text-muted-foreground" : "text-red-400"}`}>
              {segundosRestantes > 0 ? `Expira em ${mm}:${ss}` : "Código expirado"}
            </p>
            <p className="mt-1 text-[11px] opacity-50">-{resultado?.quantidadePontos} pontos</p>
            <Button onClick={() => setResultado(null)} className="mt-6 w-full rounded-xl bg-emerald-500 font-bold text-white">Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
      </div>
    </section>
  );
}
export default Index;
