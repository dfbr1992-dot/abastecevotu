import { useMemo } from "react";
import { useAbastecimentos } from "./use-abastecimentos";

export type ConsumoStats = {
  consumoMedioKmL: number | null;
  custoMedioPorKm: number | null;
  precoMedioLitro: number | null;
  gastoMesAtual: number;
  gastoTotal: number;
  totalAbastecimentos: number;
  temDadosSuficientes: boolean;
  historicoConsumo: Array<{ data: string; kml: number; custoKm: number; km: number; valor: number }>;
};

export function useConsumoStats(userId: string | null, veiculoId: string | null) {
  const { abastecimentos, isLoading } = useAbastecimentos(userId, veiculoId);

  const stats = useMemo<ConsumoStats>(() => {
    const sorted = [...abastecimentos].sort((a, b) => {
      const dateA = new Date(a.data).getTime();
      const dateB = new Date(b.data).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return Number(a.km_atual) - Number(b.km_atual);
    });

    const totalAbastecimentos = sorted.length;

    if (totalAbastecimentos === 0) {
      return {
        consumoMedioKmL: null,
        custoMedioPorKm: null,
        precoMedioLitro: null,
        gastoMesAtual: 0,
        gastoTotal: 0,
        totalAbastecimentos: 0,
        temDadosSuficientes: false,
        historicoConsumo: [],
      };
    }

    let gastoTotal = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let gastoMesAtual = 0;

    let somaLitros = 0;
    let somaValorParaPreco = 0;

    const consumos: number[] = [];
    const custosKm: number[] = [];
    const historicoConsumo: Array<{ data: string; kml: number; custoKm: number; km: number; valor: number }> = [];

    for (let i = 0; i < sorted.length; i++) {
      const curr = sorted[i];
      const val = Number(curr.valor_total) || 0;
      const lit = Number(curr.litros) || 0;
      const kmCurr = Number(curr.km_atual) || 0;

      gastoTotal += val;

      if (lit > 0) {
        somaLitros += lit;
        somaValorParaPreco += val;
      }

      if (curr.data) {
        const d = new Date(curr.data + "T00:00:00");
        if (!isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          gastoMesAtual += val;
        }
      }

      if (i > 0) {
        const prev = sorted[i - 1];
        const kmPrev = Number(prev.km_atual) || 0;
        const kmRodados = kmCurr - kmPrev;

        if (kmRodados > 0 && lit > 0) {
          const kml = kmRodados / lit;
          if (isFinite(kml) && kml > 0 && kml < 100) {
            consumos.push(kml);
            const custoKm = val / kmRodados;
            custosKm.push(custoKm);
            historicoConsumo.push({
              data: new Date(curr.data + "T00:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
              kml: parseFloat(kml.toFixed(2)),
              custoKm: parseFloat(custoKm.toFixed(2)),
              km: kmCurr,
              valor: val,
            });
          }
        }
      }
    }

    const consumoMedioKmL = consumos.length > 0 ? consumos.reduce((a, b) => a + b, 0) / consumos.length : null;
    const custoMedioPorKm = custosKm.length > 0 ? custosKm.reduce((a, b) => a + b, 0) / custosKm.length : null;
    const precoMedioLitro = somaLitros > 0 ? somaValorParaPreco / somaLitros : null;

    return {
      consumoMedioKmL: consumoMedioKmL !== null ? parseFloat(consumoMedioKmL.toFixed(2)) : null,
      custoMedioPorKm: custoMedioPorKm !== null ? parseFloat(custoMedioPorKm.toFixed(2)) : null,
      precoMedioLitro: precoMedioLitro !== null ? parseFloat(precoMedioLitro.toFixed(2)) : null,
      gastoMesAtual: parseFloat(gastoMesAtual.toFixed(2)),
      gastoTotal: parseFloat(gastoTotal.toFixed(2)),
      totalAbastecimentos,
      temDadosSuficientes: totalAbastecimentos >= 2 && consumos.length > 0,
      historicoConsumo,
    };
  }, [abastecimentos]);

  return { stats, rawHistory: abastecimentos, isLoading };
}
