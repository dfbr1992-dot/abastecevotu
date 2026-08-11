import { useConsumoStats } from "@/hooks/use-consumo-stats";
import { fmtCurrency } from "@/lib/utils-fmt";
import { ArrowLeft, Droplets, TrendingUp, BarChart3, Zap, History, Plus } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function fmt(v: number) {
  return Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function MeuConsumoScreen({
  userId,
  vehicle,
  onBack,
  onOpenFuelModal,
  theme,
}: {
  userId: string | null;
  vehicle: any;
  onBack: () => void;
  onOpenFuelModal: () => void;
  theme: string;
}) {
  const { stats, rawHistory, isLoading } = useConsumoStats(userId, vehicle?.id ?? null);
  const vehicleName = vehicle ? `${vehicle.marca} ${vehicle.modelo}` : "Meu Veículo";

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="opacity-60">Carregando estatísticas...</p>
      </div>
    );
  }

  if (stats.totalAbastecimentos === 0) {
    return (
      <div className={`rounded-[22px] border p-8 text-center space-y-4 ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <BarChart3 size={28} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold">Nenhum abastecimento registrado</h3>
          <p className="text-xs opacity-60">Registre seu primeiro abastecimento para começar a ver suas estatísticas.</p>
        </div>
        <button
          onClick={onOpenFuelModal}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
        >
          <Plus size={16} /> Registrar Abastecimento
        </button>
      </div>
    );
  }

  if (stats.totalAbastecimentos === 1) {
    return (
      <div className="space-y-4">
        <div className={`rounded-[22px] border p-5 ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
          <p className="text-[11px] font-bold uppercase tracking-widest opacity-50">Total Gasto</p>
          <p className="mt-1 text-2xl font-black font-mono text-emerald-500">{fmt(stats.gastoTotal)}</p>
          <p className="mt-1 text-xs opacity-50">Baseado em {stats.totalAbastecimentos} abastecimento</p>
        </div>
        {stats.precoMedioLitro !== null && (
          <div className={`rounded-[22px] border p-5 ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-50">Preço Médio por Litro</p>
            <p className="mt-1 text-2xl font-black font-mono">{fmt(stats.precoMedioLitro)}</p>
          </div>
        )}
        <div className={`rounded-[22px] border p-5 text-center ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
          <p className="text-xs opacity-60">Registre mais um abastecimento para ver sua média de consumo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cards de Destaque (Grid 2x2) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Consumo Médio */}
        <div className={`rounded-[20px] border p-4 flex flex-col justify-between ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <Droplets size={16} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Consumo Médio</span>
          </div>
          <p className="text-xl font-black font-mono">
            {stats.consumoMedioKmL !== null ? `${stats.consumoMedioKmL.toFixed(1)}` : "—"}
            <span className="text-xs font-medium opacity-50 ml-1">km/L</span>
          </p>
        </div>

        {/* Custo Médio por Km */}
        <div className={`rounded-[20px] border p-4 flex flex-col justify-between ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
              <TrendingUp size={16} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Custo por Km</span>
          </div>
          <p className="text-xl font-black font-mono">
            {stats.custoMedioPorKm !== null ? fmt(stats.custoMedioPorKm) : "—"}
          </p>
        </div>

        {/* Gasto no Mês Atual */}
        <div className={`rounded-[20px] border p-4 flex flex-col justify-between ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
              <Zap size={16} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Gasto no Mês</span>
          </div>
          <p className="text-xl font-black font-mono text-emerald-500">
            {fmt(stats.gastoMesAtual)}
          </p>
        </div>

        {/* Preço Médio por Litro */}
        <div className={`rounded-[20px] border p-4 flex flex-col justify-between ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
              <BarChart3 size={16} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Preço Médio/L</span>
          </div>
          <p className="text-xl font-black font-mono">
            {stats.precoMedioLitro !== null ? fmt(stats.precoMedioLitro) : "—"}
          </p>
        </div>
      </div>

      {/* Total Gasto Histórico */}
      <div className={`rounded-[22px] border p-5 ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
        <p className="text-[11px] font-bold uppercase tracking-widest opacity-50">Total Gasto</p>
        <p className="mt-1 text-3xl font-black font-mono text-emerald-500">{fmt(stats.gastoTotal)}</p>
        <p className="mt-1 text-xs opacity-50">Baseado em {stats.totalAbastecimentos} abastecimentos</p>
      </div>

      {/* Gráfico de Evolução de Consumo */}
      {stats.historicoConsumo.length > 0 && (
        <div className={`rounded-[22px] border p-5 ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
          <h4 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3">Evolução do Consumo</h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.historicoConsumo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorKml" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1a1a2e" : "#fff",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="kml" stroke="#10b981" fill="url(#colorKml)" strokeWidth={2} name="km/L" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Últimos Abastecimentos */}
      <div className={`rounded-[22px] border p-5 ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
        <h4 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3">Últimos Abastecimentos</h4>
        <div className="space-y-2.5">
          {rawHistory
            .slice()
            .reverse()
            .slice(0, 5)
            .map((a: any) => (
              <div key={a.id} className={`flex items-center justify-between p-3 rounded-xl ${theme === "dark" ? "bg-white/5" : "bg-zinc-50"}`}>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold">{new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                  <p className="text-xs opacity-50">{a.km_atual} KM • {a.litros}L</p>
                </div>
                <span className="text-sm font-black font-mono text-emerald-500">{fmt(Number(a.valor_total || 0))}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
