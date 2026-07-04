import React from 'react';
import { Lock } from 'lucide-react';

interface ComingSoonOverlayProps {
  title?: string;
  description?: string;
}

const ComingSoonOverlay: React.FC<ComingSoonOverlayProps> = ({ 
  title = "Em breve: Abastece+", 
  description = "Estamos preparando prêmios exclusivos para você. Fique atento ao lançamento na próxima semana!" 
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden rounded-[22px] bg-background/60 backdrop-blur-[2px]">
      <div className="mx-4 max-w-sm rounded-[22px] border border-white/20 bg-card/80 p-8 text-center shadow-2xl backdrop-blur-md">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500">
            <Lock className="h-8 w-8" />
          </div>
        </div>
        <h2 className="mb-2 text-2xl font-black tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-sm opacity-70">
          {description}
        </p>

      </div>
    </div>
  );
};

export default ComingSoonOverlay;
