import type { PostoServicos } from '@/hooks/usePostoServicos';
import { ShoppingCart, Flame, Droplet, Zap, Ticket } from 'lucide-react';

const ICONES = [
  { key: 'conveniencia', icon: ShoppingCart, label: 'Conveniência' },
  { key: 'gas_cozinha', icon: Flame, label: 'Gás' },
  { key: 'troca_oleo', icon: Droplet, label: 'Óleo' },
  { key: 'carregador_ev', icon: Zap, label: 'EV' },
  { key: 'aceita_ticket', icon: Ticket, label: 'Ticket' },
] as const;

export function ServicosIcones({ servicos }: { servicos: PostoServicos | null | undefined }) {
  return (
    <div className="flex gap-2.5 items-center">
      {ICONES.map(({ key, icon: Icon, label }) => {
        const ativo = servicos?.[key as keyof PostoServicos];
        return (
          <div
            key={key}
            title={label}
            className="flex items-center justify-center p-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: ativo ? 'rgba(61, 220, 132, 0.1)' : 'rgba(107, 114, 128, 0.05)',
            }}
          >
            <Icon
              size={16}
              color={ativo ? '#3ddc84' : '#9ca3af'}
              strokeWidth={2}
            />
          </div>
        );
      })}
    </div>
  );
}
