import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  ArrowLeft,
  BarChart3,
  Droplets,
  TrendingUp,
  Zap,
  Plus,
  Trash2,
  Fuel,
} from "lucide-react";
import { useConsumoStats } from "@/hooks/use-consumo-stats";
import { useAbastecimentos } from "@/hooks/use-abastecimentos";
import type { Vehicle } from "@/hooks/use-vehicle";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const FUEL_COLORS: Record<string, string> = {
  Etanol: "#10b981",
  Gasolina: "#3b82f6",
  Diesel: "#f59e0b",
};

export default function MeuConsumoScreen({
  userId,
  vehicle,
  onBack,
  onOpenFuelModal,
  theme,
}: {
  userId: string | null;
  vehicle: Vehicle | null;
  onBack: () => void;
  onOpenFuelModal: () => void;
  theme: string;
}) {
  const veiculoId = vehicle?.id ?? null;
  const { stats, rawHistory } = useConsumoStats(userId, veiculoId);
  const { deleteAbastecimento, isDeleting } = useAbastecimentos(userId, veiculoId);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const backBtn = (
    <button
      onClick={onBack}
      className="mb-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors hover:bg-white/5"
    >
      <ArrowLeft size={16} /> Voltar
    </button>
  );

  const emptyCard = (
    <div>
      {backBtn}
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
    </div>
  );

  if (stats.totalAbastecimentos === 0) return <div>{emptyCard}</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h3 className={`text-[13px] font-extrabold uppercase tracking-widest ${theme === "dark" ? "text-muted-foreground/80" : "text-zinc-500"}`}>
          Consumo — {vehicle?.marca ?? ""} {vehicle?.modelo ?? ""}
        </h3>
        <button
          onClick={onBack}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors hover:bg-white/5 ${theme === "dark" ? "text-muted-foreground" : "text-zinc-500"}`}
        >
          <ArrowLeft size={14} /> Voltar
        </button>
      </div>

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
        <p className="mt-1 text-xs opacity-50">Baseado em {stats.totalAbastecimentos} abastecimento{stats.totalAbastecimentos !== 1 ? "s" : ""}</p>
      </div>

      {/* Gráfico de Evolução de Consumo */}
      {stats.temDadosSuficientes && (
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
                  formatter={(value: any, name: any) => [`${value} km/L`, name]}
                />
                <Area type="monotone" dataKey="kml" stroke="#10b981" fill="url(#colorKml)" strokeWidth={2} name="km/L" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gráfico de Combustível (Gasto por tipo) */}
      {stats.graficoCombustivel.length > 0 && (
        <div className={`rounded-[22px] border p-5 ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
          <div className="flex items-center gap-2 mb-3">
            <Fuel size={14} className="opacity-50" />
            <h4 className="text-xs font-bold uppercase tracking-widest opacity-50">Gasto por Combustível</h4>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.graficoCombustivel} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                <XAxis dataKey="combustivel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, "auto"]} />
                <Tooltip
                  cursor={{ fill: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1a1a2e" : "#fff",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value: any, _name: any, entry: any) => {
                    const litros = entry?.payload?.litros ?? 0;
                    return [`${fmt(value)} (${litros.toFixed(1)} L)`, "Gasto"];
                  }}
                />
                <Bar dataKey="gasto" radius={[8, 8, 0, 0]}>
                  {stats.graficoCombustivel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={FUEL_COLORS[entry.combustivel] ?? "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {stats.graficoCombustivel.map((g) => (
              <span key={g.combustivel} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FUEL_COLORS[g.combustivel] }} />
                {g.combustivel}: {fmt(g.gasto)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Últimos Abastecimentos */}
      <div className={`rounded-[22px] border p-5 ${theme === "dark" ? "border-white/5 bg-[#161618]" : "border-zinc-200 bg-white shadow-sm"}`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-widest opacity-50">Últimos Abastecimentos</h4>
          <button
            onClick={onOpenFuelModal}
            className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-500"
          >
            <Plus size={12} /> Adicionar
          </button>
        </div>
        <div className="space-y-2.5">
          {rawHistory
            .slice()
            .reverse()
            .slice(0, 10)
            .map((a) => (
              <div key={a.id} className={`flex items-center justify-between p-3 rounded-xl ${theme === "dark" ? "bg-white/5" : "bg-zinc-50"}`}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                      a.combustivel === "etanol" ? "bg-emerald-500/15 text-emerald-500" :
                      a.combustivel === "diesel" ? "bg-amber-500/15 text-amber-500" :
                      "bg-blue-500/15 text-blue-500"
                    }`}>{a.combustivel ?? "gasolina"}</span>
                  </div>
                  <p className="text-xs opacity-50">{a.km_atual} KM • {a.litros}L</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black font-mono text-emerald-500">{fmt(Number(a.valor_total || 0))}</span>
                  <button
                    onClick={async () => {
                      try {
                        await deleteAbastecimento(a.id);
                        showToast("Abastecimento excluído");
                      } catch {
                        showToast("Erro ao excluir");
                      }
                    }}
                    disabled={isDeleting}
                    className={`p-1.5 rounded-full transition-colors ${theme === "dark" ? "text-red-400/60 hover:text-red-400 hover:bg-red-500/10" : "text-red-300 hover:text-red-500 hover:bg-red-50"}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg animate-in fade-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}
    </div>
  );
}
