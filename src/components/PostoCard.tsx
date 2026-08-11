import { useState } from 'react';
import { usePostoServicos } from '@/hooks/usePostoServicos';
import { ServicosIcones } from './ServicosIcones';
import { ChevronDown } from 'lucide-react';

const SERVICOS_DETALHE = [
  { key: 'conveniencia', label: 'Conveniência' },
  { key: 'gas_cozinha', label: 'Gás de cozinha' },
  { key: 'troca_oleo', label: 'Troca de óleo' },
  { key: 'carregador_ev', label: 'Carregador EV' },
  { key: 'aceita_ticket', label: 'Aceita ticket' },
] as const;

type Posto = {
  id: string;
  name: string;
  address: string;
  hours: string;
  prices: Record<string, number>;
  distance: number | null;
  likes?: number;
  dislikes?: number;
};

export function PostoCard({ posto, theme = 'dark' }: { posto: Posto; theme?: string }) {
  const { data: servicos, isLoading } = usePostoServicos(posto.id);
  const [open, setOpen] = useState(false);

  const temAlgumServico = servicos
    ? SERVICOS_DETALHE.some(({ key }) => servicos[key as keyof typeof servicos])
    : false;

  return (
    <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-white/10 bg-[#161618]' : 'border-zinc-200 bg-white'}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className={`flex items-center gap-1 text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
            {posto.name}
          </div>
          <p className={`mt-0.5 text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>{posto.address}</p>
          <p className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>{posto.hours}</p>
        </div>
      </div>

      {/* Preço */}
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className={`text-[11px] tracking-wide ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>PREÇO ETANOL</div>
          <div className="mt-0.5 text-2xl font-medium text-emerald-500">
            R$ {(posto.prices['etanol'] || 0).toFixed(2).replace('.', ',')}
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] ${theme === 'dark' ? 'bg-white/5 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>
          {posto.distance || 0} km
        </span>
      </div>

      {/* Ícones + Ver mais */}
      <div className="mt-3.5 flex items-center justify-between">
        {isLoading ? (
          <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
        ) : (
          <ServicosIcones servicos={servicos} />
        )}

        {temAlgumServico && (
          <button
            onClick={() => setOpen((v) => !v)}
            className={`flex items-center gap-0.5 text-xs ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}
          >
            Ver mais
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Painel expandido */}
      {open && servicos && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {SERVICOS_DETALHE.map(({ key, label }) => {
            const ativo = servicos[key as keyof typeof servicos];
            return (
              <div key={key} className="flex items-center justify-between text-xs">
                <div
                  className="flex items-center gap-2"
                  style={{ color: ativo ? (theme === 'dark' ? '#c7cdc9' : '#3b3b3b') : (theme === 'dark' ? '#6b756f' : '#9ca3af') }}
                >
                  {label}
                </div>
                <span
                  style={{ color: ativo ? '#3ddc84' : '#454f4a' }}
                >
                  {ativo ? '✓' : '✕'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
