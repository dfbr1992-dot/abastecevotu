import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";
import logoAbasteceVotu from "@/assets/logo-abastece-votu.png";

export const Route = createFileRoute("/recuperar-senha")({
  component: RecuperarSenhaPage,
  head: () => ({ meta: [{ title: "Recuperar Senha — Abastece Votu" }] }),
});

function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (!email.trim()) throw new Error("Por favor, digite seu e-mail.");

      // O redirectTo define para onde o usuário vai ao clicar no link do e-mail.
      // Ajustaremos para uma rota que criaremos a seguir.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/atualizar-senha`,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success("E-mail de recuperação enviado!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao tentar enviar o e-mail.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-xl font-bold text-white mb-2">Recuperar Senha</h1>
            <p className="text-xs text-muted-foreground">
              Digite o e-mail cadastrado e enviaremos um link para você redefinir sua senha.
            </p>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center py-6 animate-fade-in space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                <MailCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-center text-sm font-medium text-emerald-400">
                Link enviado com sucesso!
              </p>
              <p className="text-center text-xs text-muted-foreground">
                Verifique sua caixa de entrada e a pasta de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">E-mail</Label>
                <Input 
                  id="email" 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="voce@email.com" 
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
                  <span>Enviar Link</span>
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Botão Voltar */}
        <div className="text-center mt-6">
          <Link 
            to="/login"
            search={{ redirect: "/" }}
            className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-muted-foreground transition-all duration-200 hover:text-white bg-white/[0.02] border border-white/5 hover:border-white/10 px-4 py-2.5 rounded-full backdrop-blur"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Login
          </Link>
        </div>

      </div>
    </div>
  );
}