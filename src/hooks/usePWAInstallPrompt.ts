import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstallPrompt() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Impede o prompt padrão do navegador
      e.preventDefault();
      // Salva o evento para disparar o prompt mais tarde
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
      // Mostra o nosso componente personalizado
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Se o app já estiver instalado, o evento não será disparado
    // Também podemos verificar se o app já está rodando em modo standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;

    // Mostra o prompt nativo
    await installPromptEvent.prompt();

    // Espera pela escolha do usuário
    const { outcome } = await installPromptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // Limpa o evento e esconde o nosso pop-up independentemente da escolha
    setInstallPromptEvent(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Opcional: Salvar no localStorage para não incomodar o usuário por X dias
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  return { isVisible, handleInstallClick, handleDismiss };
}
