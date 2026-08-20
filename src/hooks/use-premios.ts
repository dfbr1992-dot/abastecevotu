import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Premio = Tables<"premios">;

export function usePremiosPorPosto(postoId: string | null) {
  return useQuery({
    queryKey: ["premios", postoId],
    queryFn: async () => {
      if (!postoId) return [];
      const { data, error } = await supabase
        .from("premios")
        .select("*")
        .eq("posto_id", postoId)
        .eq("ativo", true)
        .order("pontos_necessarios", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!postoId,
  });
}

/** Saldo de pontos do usuário logado num posto específico. Sem linha na view = 0. */
export function useSaldoPorPosto(userId: string | null, postoId: string | null) {
  return useQuery({
    queryKey: ["saldo_pontos_por_posto", userId, postoId],
    queryFn: async () => {
      if (!userId || !postoId) return 0;
      const { data, error } = await supabase
        .from("saldo_pontos_por_posto")
        .select("saldo")
        .eq("user_id", userId)
        .eq("posto_id", postoId)
        .maybeSingle();

      if (error) throw error;
      return data?.saldo ?? 0;
    },
    enabled: !!userId && !!postoId,
  });
}
