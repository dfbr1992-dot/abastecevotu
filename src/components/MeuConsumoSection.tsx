import { useConsumoStats } from "@/hooks/use-consumo-stats";
import { fmtCurrency } from "@/lib/utils-fmt";
import { ArrowLeft, Droplets, TrendingUp, BarChart3, Zap, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function MeuConsumoSection({
  userId,
  vehicle,
  setSection,
  onOpenFuelModal,
  theme,
}: {
  userId: string | null;
  vehicle: any;
  setSection: (s: any) => void;
  onOpenFuelModal: () => void;
  theme: string;
}) {
  const { stats, rawHistory, isLoading } = useConsumoStats(userId, vehicle?.id ?? null);
  const vehicleName = vehicle ? `${vehicle.marca} ${vehicle.modelo}` : "Meu Veículo";
  const fmt = fmtCurrency;

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 space-y-5 pt-2 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setSection("carro")}
          className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl border transition-all ${
            theme === "dark" ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
          }`}
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <span className="text-[11px] font-bold uppercase tracking-widest opacity-60">Estatísticas (Cloud)</span>
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-black tracking-tight">Meu Consumo</h2>
        <p className="text-xs font-medium opacity-60">{vehicleName}</p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center opacity-60">Carregando estatísticas...</div>
      ) : stats.totalAbastecimentos === 0 ? (
        <div className={`rounded-[22px] border p-8 text-center space-y-4 ${theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <Droplets size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold">Nenhum abastecimento registrado</h3>
            <p className="text-xs opacity-60 max-w-xs mx-auto">
              Registre seu primeiro abastecimento na Garagem para começar a ver suas estatísticas de consumo na nuvem.
            </p>
          </div>
          <Button onClick={onOpenFuelModal} className="rounded-xl bg-emerald-500 font-bold text-white px-6">
            Registrar Abastecimento
          </Button>
        </div>
      ) : (
        <>
          {/* Cards de Destaque (Grid 2x2) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Consumo Médio */}
            <div className={`rounded-[20px] border p-4 flex flex-col justify-between ${theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Consumo Médio</span>
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Droplets size={16} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black font-mono tracking-tight text-emerald-500">
                  {stats.consumoMedioKmL !== null ? `${stats.consumoMedioKmL}` : "—"}
                </span>
                <span className="text-xs font-bold opacity-60 ml-1">km/l</span>
              </div>
              {!stats.temDadosSuficientes && (
                <p className="text-[9px] opacity-50 mt-1">Requer +1 abastecimento</p>
              )}
            </div>

            {/* Custo Médio por KM */}
            <div className={`rounded-[20px] border p-4 flex flex-col justify-between ${theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Custo por KM</span>
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black font-mono tracking-tight text-blue-400">
                  {stats.custoMedioPorKm !== null ? fmt(stats.custoMedioPorKm) : "—"}
                </span>
              </div>
              {!stats.temDadosSuficientes && (
                <p className="text-[9px] opacity-50 mt-1">Requer +1 abastecimento</p>
              )}
            </div>

            {/* Gasto no Mês Atual */}
            <div className={`rounded-[20px] border p-4 flex flex-col justify-between ${theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Gasto no Mês</span>
                <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <BarChart3 size={16} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xl font-black font-mono tracking-tight">
                  {fmt(stats.gastoMesAtual)}
                </span>
              </div>
            </div>

            {/* Preço Médio por Litro */}
            <div className={`rounded-[20px] border p-4 flex flex-col justify-between ${theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Preço Médio / L</span>
                <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                  <Zap size={16} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xl font-black font-mono tracking-tight">
                  {stats.precoMedioLitro !== null ? fmt(stats.precoMedioLitro) : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Gráfico de Evolução de Consumo (Recharts) */}
          {stats.historicoConsumo.length > 0 && (
            <div className={`rounded-[22px] border p-5 ${theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-500" />
                  <h4 className="text-[11px] font-bold uppercase tracking-widest">Evolução do Consumo (KM/L)</h4>
                </div>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.historicoConsumo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorKml" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                    <XAxis dataKey="data" stroke={theme === "dark" ? "#71717a" : "#a1a1aa"} fontSize={10} tickLine={false} />
                    <YAxis stroke={theme === "dark" ? "#71717a" : "#a1a1aa"} fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === "dark" ? "#18181b" : "#ffffff",
                        borderColor: theme === "dark" ? "#27272a" : "#e4e4e7",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: theme === "dark" ? "#f4f4f5" : "#18181b",
                      }}
                    />
                    <Area type="monotone" dataKey="kml" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorKml)" name="KM/L" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Card Total Gasto */}
          <div className={`rounded-[22px] border p-5 ${theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Total Gasto (Histórico Cloud)</span>
                <h3 className="text-2xl font-black font-mono tracking-tight mt-1 text-emerald-500">
                  {fmt(stats.gastoTotal)}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold opacity-60">
                  {stats.totalAbastecimentos} {stats.totalAbastecimentos === 1 ? "abastecimento" : "abastecimentos"}
                </span>
              </div>
            </div>
          </div>

          {stats.totalAbastecimentos === 1 && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-xs font-semibold text-yellow-600 dark:text-yellow-400">
              💡 Registre mais um abastecimento para habilitar o gráfico de evolução de consumo (km/l) e custo por km.
            </div>
          )}

          {/* Histórico detalhado recente */}
          <div className={`rounded-[22px] border p-5 ${theme === "dark" ? "border-white/10 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History size={16} className="opacity-50" />
                <h4 className="text-[11px] font-bold uppercase tracking-widest">Histórico de Abastecimentos</h4>
              </div>
              <Button onClick={onOpenFuelModal} size="sm" className="h-8 rounded-lg bg-emerald-500 text-xs font-bold text-white gap-1">
                <Plus size={14} /> Novo
              </Button>
            </div>

            <div className="space-y-2.5">
              {rawHistory.map((a: any) => (
                <div key={a.id} className={`flex items-center justify-between p-3 rounded-xl ${theme === "dark" ? "bg-white/5" : "bg-zinc-50"}`}>
                  <div>
                    <p className="text-xs font-bold">{new Date(a.data + "T00:00:00").toLocaleDateString('pt-BR')}</p>
                    <p className="text-[10px] opacity-50">{a.km_atual} KM • {a.litros}L</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-emerald-500">
                      {fmt(Number(a.valor_total || 0))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
