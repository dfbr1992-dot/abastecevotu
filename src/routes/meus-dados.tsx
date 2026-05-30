import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { usePremium } from "@/hooks/use-rewards";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Mail, Phone, MapPin, LogOut, ShieldAlert, CheckCircle } from "lucide-react";

// 🚀 1. REGISTRO DA ROTA NO TANSTACK
export const Route = createFileRoute("/meus-dados")({
  component: MeusDadosRoute,
});

// 🚀 2. WRAPPER DA ROTA (Responsável por injetar o tema)
function MeusDadosRoute() {
  // Se você tiver um hook de tema (ex: useTheme), chame ele aqui.
  // Por enquanto, vou deixar "dark" como padrão para o teste funcionar.
  const theme = "dark"; 
  
  return <MeusDadosPage theme={theme} />;
}

// 🚀 3. SEU COMPONENTE ORIGINAL (Intacto)
export function MeusDadosPage({ theme }: { theme: string }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isPremium } = usePremium();

  // Estados do formulário
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("Votuporanga");
  const [estado, setEstado] = useState("SP");

  // Carregar dados do perfil do Supabase ao entrar na tela
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, phone, city, state")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (data) {
          setNome(data.full_name || "");
          setTelefone(data.phone || "");
          setCidade(data.city || "Votuporanga");
          setEstado(data.state || "SP");
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  // Salvar alterações
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: nome,
          phone: telefone,
          city: cidade,
          state: estado,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setSuccessMsg("Dados atualizados com sucesso!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Erro ao salvar:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-24">
      
      {/* 🏛️ ITEM 1: CABEÇALHO DO PERFIL */}
      <div className={`p-5 rounded-[22px] border flex items-center gap-4 transition-all duration-200 ${
        theme === "dark" 
          ? "border-white/10 bg-[#161618]" 
          : "border-zinc-200 bg-white shadow-sm"
      }`}>
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border text-2xl relative ${
          theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-zinc-100 border-zinc-200 text-zinc-700"
        }`}>
          👤
          {isPremium && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px]" title="Premium">
              👑
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`text-lg font-bold truncate ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
            {nome || "Usuário Abastece+"}
          </h3>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
            <Mail className="h-3 w-3" /> {user?.email}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
              isPremium 
                ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                : theme === "dark" 
                  ? "bg-white/5 border-white/5 text-zinc-400" 
                  : "bg-zinc-100 border-zinc-200 text-zinc-600"
            }`}>
              {isPremium ? "Membro Premium" : "Membro Comum"}
            </span>
          </div>
        </div>
      </div>

      {/* 📝 ITEM 3: FORMULÁRIO DE INFORMAÇÕES PESSOAIS */}
      <form onSubmit={handleSave} className={`p-5 rounded-[22px] border space-y-4 transition-all duration-200 ${
        theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"
      }`}>
        <h4 className={`text-sm font-bold uppercase tracking-wider mb-2 ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}>
          Meus Dados Pessoais
        </h4>

        {successMsg && (
          <div className="flex items-center gap-2 p-3 text-xs font-semibold rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
            <CheckCircle className="h-4 w-4" />
            {successMsg}
          </div>
        )}

        {/* Campo Nome */}
        <div className="space-y-1.5">
          <label className={`text-xs font-bold ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>Nome Completo</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-purple/20 ${
                theme === "dark" 
                  ? "bg-white/5 border-white/10 text-white focus:border-brand-purple" 
                  : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-brand-purple"
              }`}
              required
            />
          </div>
        </div>

        {/* Campo Telefone */}
        <div className="space-y-1.5">
          <label className={`text-xs font-bold ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>WhatsApp / Telefone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(17) 99999-9999"
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-purple/20 ${
                theme === "dark" 
                  ? "bg-white/5 border-white/10 text-white focus:border-brand-purple" 
                  : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-brand-purple"
              }`}
            />
          </div>
        </div>

        {/* Grid de Cidade / Estado */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <label className={`text-xs font-bold ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>Cidade</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm font-medium transition-all ${
                  theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                }`}
                disabled
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={`text-xs font-bold ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>UF</label>
            <input
              type="text"
              value={estado}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm text-center font-medium transition-all ${
                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
              }`}
              disabled
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full mt-2 flex h-11 items-center justify-center rounded-xl bg-brand-purple text-white font-bold text-sm shadow-md hover:bg-brand-purple/90 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alterações"}
        </button>
      </form>

      {/* 🔐 ITEM 5: ZONA DE SEGURANÇA E CONTA */}
      <div className={`p-5 rounded-[22px] border space-y-3 transition-all duration-200 ${
        theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"
      }`}>
        <h4 className={`text-sm font-bold uppercase tracking-wider mb-1 ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}>
          Segurança da Conta
        </h4>

        {/* Ação de Sair */}
        <button
          onClick={handleLogout}
          className={`flex w-full items-center justify-between p-3 rounded-xl border transition-all text-sm font-bold ${
            theme === "dark"
              ? "bg-white/5 border-white/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/20"
              : "bg-zinc-50 border-zinc-200 text-red-600 hover:bg-red-50 hover:border-red-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LogOut className="h-4 w-4" />
            <span>Desconectar desta conta</span>
          </div>
          <span className="text-xs opacity-60">Sair →</span>
        </button>

        {/* Ação de Excluir Conta perigosa */}
        <button
          onClick={() => {
            if (confirm("Tem certeza absoluta que deseja deletar sua conta? Esta ação não pode ser desfeita e você perderá seus pontos.")) {
              // lógica futura de deleteUser
            }
          }}
          className={`flex w-full items-center justify-between p-3 rounded-xl border border-dashed transition-all text-xs font-semibold ${
            theme === "dark"
              ? "border-red-900/40 bg-red-950/10 text-red-400/70 hover:bg-red-950/30"
              : "border-red-200 bg-red-50/30 text-red-600/80 hover:bg-red-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Excluir minha conta permanentemente</span>
          </div>
        </button>
      </div>

    </div>
  );
}