import React from 'react';
import { X, Smartphone, Download } from 'lucide-react';
import { usePWAInstallPrompt } from '../hooks/usePWAInstallPrompt';

export function InstallPWA() {
  const { isVisible, handleInstallClick, handleDismiss } = usePWAInstallPrompt();

  if (!isVisible) return null;

  // Verifica se o usuário já fechou o prompt recentemente (opcional)
  const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
  if (lastDismissed) {
    const oneDayInMs = 24 * 60 * 60 * 1000;
    if (Date.now() - parseInt(lastDismissed) < oneDayInMs) {
      return null;
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom duration-500">
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-0.5 shadow-2xl shadow-blue-500/20">
        <div className="relative rounded-[calc(1rem-2px)] bg-slate-900 p-5">
          {/* Botão de Fechar */}
          <button 
            onClick={handleDismiss}
            className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-4">
            {/* Ícone/Avatar do App */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <Smartphone size={24} />
            </div>

            <div className="flex-1 pr-6">
              <h3 className="text-lg font-bold text-white">Abastece Votu no Celular</h3>
              <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                Instale agora para ter acesso mais rápido aos preços de combustíveis e agendamentos!
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleInstallClick}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-600/20"
            >
              <Download size={18} />
              Instalar App
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
