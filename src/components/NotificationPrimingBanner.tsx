import { useState } from "react";
import { Bell, X } from "lucide-react";
import {
  requestPushPermissionAndRegister,
  dismissNotificationPriming,
} from "@/lib/push-service";

// Banner de priming: mostra o valor da notificação ANTES do prompt nativo do
// navegador. Só é renderizado quando o chamador já validou
// shouldShowNotificationPriming() (permissão ainda "default", fora do
// cooldown de 14 dias e usuário autenticado) — este componente não repete
// essa checagem, apenas dispara o pedido no clique de "Ativar".
export function NotificationPrimingBanner({
  userId,
  theme,
  onClose,
}: {
  userId: string;
  theme: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    setLoading(true);
    try {
      await requestPushPermissionAndRegister(userId);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleDismiss = () => {
    dismissNotificationPriming();
    onClose();
  };

  return (
    <div
      className={`relative mt-3 mb-4 flex items-start gap-3 rounded-2xl border p-4 ${
        theme === "dark"
          ? "border-emerald-500/20 bg-emerald-500/[0.06]"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
        <Bell className="h-5 w-5 text-emerald-500" />
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
          Ative os alertas de preço
        </p>
        <p className={`mt-0.5 text-xs ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>
          Receba um alerta quando o preço baixar no posto que você favoritou.
        </p>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleActivate}
            disabled={loading}
            className="min-h-[36px] rounded-full bg-emerald-500 px-4 text-xs font-black uppercase tracking-wide text-white transition-transform active:scale-95 disabled:opacity-60"
          >
            {loading ? "Ativando..." : "Ativar"}
          </button>
          <button
            onClick={handleDismiss}
            className={`min-h-[36px] rounded-full px-4 text-xs font-bold ${
              theme === "dark" ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Agora não
          </button>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        aria-label="Fechar aviso de notificações"
        className={`shrink-0 rounded-full p-1 transition-colors ${
          theme === "dark" ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-zinc-900"
        }`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
