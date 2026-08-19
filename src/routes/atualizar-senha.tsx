import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import logoAbasteceVotu from "@/assets/logo-abastece-votu.png";

export const Route = createFileRoute("/atualizar-senha")({
  component: AtualizarSenhaPage,
  head: () => ({ meta: [{ title: "Nova Senha — Abastece Votu" }] }),
});

function AtualizarSenhaPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Escuta ativa do Supabase para pegar a sessão vinda do link do e-mail
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Se o evento for PASSWORD_RECOVERY ou houver uma sessão ativa temporária, liberamos a tela
      if (event === "PASSWORD_RECOVERY" || session) {
        setCheckingSession(false);
      } else {
        // Dá um pequeno tempo para o Supabase processar o hash da URL
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          toast.error("Link expirado ou inválido. Solicite a recuperação novamente.");
          navigate({ to: "/recuperar-senha" });
        } else {
          setCheckingSession(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (password.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres.");
      if (password !== confirmPassword) throw new Error("As senhas não coincidem.");

      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      // É uma excelente prática deslogar o usuário após trocar a senha para forçar o login limpo
      await supabase.auth.signOut();

      toast.success("Senha atualizada com sucesso! Faça login com suas novas credenciais.");
      navigate({ to: "/login", search: { redirect: "/" } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar a senha.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // Enquanto o Supabase lê os dados da URL, exibimos uma tela de carregamento limpa
  if (checkingSession) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0B0F19] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Validando token de segurança...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0B0F19] p-4 text-white sm:p-6">
      <div className="relative w-full max-w-[400px] animate-fade-in">
        
        {/* Topo com Logo e Glow Premium */}
        <div className="relative mb-8 text-center">
          <div className="absolute top-1/2 left-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[50px] pointer-events-none" />
          <img
            src={logoAbasteceVotu}
            alt="Abastece Votu"
            className="relative z-10 mx-auto h-16 w-auto object-contain select-none filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          />
        </div>

        {/* Card Principal */}
        <div className="glass-card overflow-hidden rounded-[24px] border border-white/5 bg-card/40 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl">
          
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Criar Nova Senha
            </h1>
            <p className="text-xs text-muted-foreground">
              Digite e confirme sua nova senha de acesso abaixo.
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Nova Senha</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                minLength={6}
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Mínimo 6 caracteres" 
                className="h-10 border-white/10 bg-secondary/30 focus-visible:ring-primary" 
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Confirmar Nova Senha</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                required 
                minLength={6}
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="Repita a nova senha" 
                className="h-10 border-white/10 bg-secondary/30 focus-visible:ring-primary" 
              />
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-[11px] text-red-500 text-center font-medium animate-fade-in">
                {errorMsg}
              </div>
            )}

            <Button type="submit" className="w-full h-11 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider shadow-lg transition duration-300 hover:opacity-90 mt-2" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Salvar Nova Senha</span>
              )}
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}