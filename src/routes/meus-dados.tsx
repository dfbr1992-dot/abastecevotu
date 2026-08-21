import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useVehicle, daysUntil } from "@/hooks/use-vehicle";
import { usePremium } from "@/hooks/use-premium-status";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Mail, Phone, MapPin, LogOut, ShieldAlert, CheckCircle, Car, Lock, AlertTriangle, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/meus-dados")({
  component: MeusDadosRoute,
});

function MeusDadosRoute() {
  const theme = "dark";
  return <MeusDadosPage theme={theme} />;
}

export function MeusDadosPage({ theme }: { theme: string }) {
  const navigate = useNavigate();
  const { user, signOut, displayName } = useAuth();
  const { isPremium } = usePremium(user?.id ?? null);
  const { vehicle } = useVehicle(user?.id ?? null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cidade, setCidade] = useState("Votuporanga");
  const [estado, setEstado] = useState("SP");

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (data) {
          setNome(data.full_name || "");
          setTelefone(data.whatsapp || "");
          setEmail(user.email || "");
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

    const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      console.error("Usuário não autenticado");
      return;
    }

    try {
      setSaving(true);
      console.log("Salvando dados para o usuário:", user.id);
      
	      const { error } = await supabase
	        .from("profiles")
	        .update({
	          full_name: nome,
	          whatsapp: telefone,
	          city: cidade,
	          state: estado,
	          updated_at: new Date().toISOString(),
	        })
	        .eq("id", user.id);

      if (error) {
        console.error("Erro do Supabase ao salvar:", error);
        throw error;
      }

      console.log("Dados salvos com sucesso!");
      setSuccessMsg("Dados atualizados com sucesso!");
      
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao salvar dados: " + (err.message || "Erro desconhecido"));
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
    <div className="max-w-2xl mx-auto p-4 space-y-6 pb-24">
      
      {/* CABEÇALHO COM PERFIL EXPANDIDO */}
      <div className={`p-6 rounded-[22px] border transition-all duration-200 ${
        theme === "dark" 
          ? "border-white/10 bg-[#161618]" 
          : "border-zinc-200 bg-white shadow-sm"
      }`}>
        <div className="flex items-start gap-4 mb-4">
          <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full border text-4xl relative ${
            theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-zinc-100 border-zinc-200 text-zinc-700"
          }`}>
            👤
            {isPremium && (
              <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-white text-sm font-bold" title="Premium">
                👑
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-2xl font-bold truncate ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
              {nome || "Usuário Abastece+"}
            </h3>
            <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5 mt-1">
              <Mail className="h-4 w-4" /> {user?.email}
            </p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
                isPremium 
                  ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" 
                  : theme === "dark" 
                    ? "bg-white/5 border-white/5 text-zinc-400" 
                    : "bg-zinc-100 border-zinc-200 text-zinc-600"
              }`}>
                {isPremium ? "🏆 Membro Premium" : "👤 Membro Comum"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RESUMO RÁPIDO DE DADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card do Veículo */}
        {vehicle && (
          <div className={`p-4 rounded-[22px] border transition-all duration-200 ${
            theme === "dark" ? "border-blue-500/20 bg-blue-500/5" : "border-blue-200 bg-blue-50"
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <Car className={`h-5 w-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
              <span className="text-xs font-bold uppercase opacity-60">Meu Carro</span>
            </div>
            <p className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
              {vehicle.modelo}
            </p>
            <p className="text-xs opacity-60 mt-1">{vehicle.placa || "Placa não registrada"}</p>
          </div>
        )}
      </div>

      {/* ALERTAS DE VENCIMENTO */}
      {vehicle && (
        <div className="space-y-3">
          {(() => {
            const daysLicensing = daysUntil(vehicle.licenciamento_vencimento);
            const daysInsurance = daysUntil(vehicle.seguro_vencimento);
            const alerts = [];

            if (daysLicensing !== null && daysLicensing <= 30) {
              alerts.push({
                type: 'licensing',
                icon: '📋',
                title: 'Licenciamento Próximo',
                description: `Seu licenciamento vence em ${daysLicensing} dias`,
                urgent: daysLicensing <= 7,
              });
            }

            if (daysInsurance !== null && daysInsurance <= 15) {
              alerts.push({
                type: 'insurance',
                icon: '🛡️',
                title: 'Seguro Vencendo',
                description: `Seu seguro vence em ${daysInsurance} dias`,
                urgent: daysInsurance <= 5,
              });
            }

            return alerts.length > 0 ? (
              <div className="space-y-2">
                <h4 className={`text-xs font-bold uppercase tracking-widest ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>
                  ⚠️ Alertas Importantes
                </h4>
                {alerts.map((alert) => (
                  <div key={alert.type} className={`p-3 rounded-xl border flex items-start gap-3 ${
                    alert.urgent
                      ? theme === "dark" ? "border-red-500/30 bg-red-500/10" : "border-red-200 bg-red-50"
                      : theme === "dark" ? "border-yellow-500/30 bg-yellow-500/10" : "border-yellow-200 bg-yellow-50"
                  }`}>
                    <span className="text-lg">{alert.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${alert.urgent ? (theme === "dark" ? "text-red-400" : "text-red-600") : (theme === "dark" ? "text-yellow-400" : "text-yellow-600")}`}>
                        {alert.title}
                      </p>
                      <p className="text-xs opacity-60">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* FORMULÁRIO DE DADOS PESSOAIS */}
      <form onSubmit={handleSave} className={`p-6 rounded-[22px] border space-y-4 transition-all duration-200 ${
        theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"
      }`}>
        <h4 className={`text-sm font-bold uppercase tracking-wider mb-4 ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}>
          Informações Pessoais
        </h4>

        {successMsg && (
          <div className="flex items-center gap-2 p-3 text-xs font-semibold rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
            <CheckCircle className="h-4 w-4" />
            {successMsg}
          </div>
        )}

        {/* Nome Completo */}
        <div className="space-y-1.5">
          <label className={`text-xs font-bold ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>Nome Completo</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-purple/20 ${
                theme === "dark" 
                  ? "bg-white/5 border-white/10 text-white focus:border-brand-purple" 
                  : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-brand-purple"
              }`}
              required
            />
          </div>
        </div>

        {/* Email (Somente Leitura) */}
        <div className="space-y-1.5">
          <label className={`text-xs font-bold ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <input
              type="email"
              value={email}
              disabled
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm font-medium transition-all ${
                theme === "dark" 
                  ? "bg-white/5 border-white/10 text-white/60" 
                  : "bg-zinc-50 border-zinc-200 text-zinc-600"
              }`}
            />
          </div>
          <p className="text-[10px] opacity-50">Email não pode ser alterado</p>
        </div>

        {/* Telefone/WhatsApp */}
        <div className="space-y-1.5">
          <label className={`text-xs font-bold ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>WhatsApp / Telefone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <input
              type="tel"
              value={telefone}
                            onChange={(e) => {
                let val = e.target.value.replace(/\D/g, "");
                if (val.length > 11) val = val.slice(0, 11);
                if (val.length > 2) val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                if (val.length > 9) val = `${val.slice(0, 10)}-${val.slice(10)}`;
                setTelefone(val);
              }}
              placeholder="(17) 99999-9999"
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-purple/20 ${
                theme === "dark" 
                  ? "bg-white/5 border-white/10 text-white focus:border-brand-purple" 
                  : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-brand-purple"
              }`}
            />
          </div>
        </div>

        {/* Cidade / Estado */}
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
	              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={`text-xs font-bold ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>UF</label>
	            <input
	              type="text"
	              value={estado}
	              onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
	              className={`w-full rounded-xl border px-4 py-2.5 text-sm text-center font-bold transition-all ${
	                theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
	              }`}
	            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full mt-4 flex h-11 items-center justify-center rounded-xl bg-brand-purple text-white font-bold text-sm shadow-md hover:bg-brand-purple/90 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alterações"}
        </button>
      </form>

      {/* SEGURANÇA E CONTA */}
      <div className={`p-6 rounded-[22px] border space-y-3 transition-all duration-200 ${
        theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"
      }`}>
        <h4 className={`text-sm font-bold uppercase tracking-wider mb-4 ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}>
          Segurança e Conta
        </h4>

        {/* Alterar Senha */}
        <button
          onClick={() => navigate({ to: "/recuperar-senha" })}
          className={`flex w-full items-center justify-between p-3 rounded-xl border transition-all text-sm font-bold ${
            theme === "dark"
              ? "bg-white/5 border-white/5 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/20"
              : "bg-zinc-50 border-zinc-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Lock className="h-4 w-4" />
            <span>Alterar Senha</span>
          </div>
          <ChevronRight className="h-4 w-4 opacity-60" />
        </button>

        {/* Desconectar */}
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
          <ChevronRight className="h-4 w-4 opacity-60" />
        </button>

        {/* Excluir Conta */}
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
