import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Abastecimento = {
  id: string;
  user_id: string;
  veiculo_id: string;
  data: string;
  km_atual: number;
  litros: number;
  valor_total: number;
  created_at?: string;
};

export function useAbastecimentos(userId: string | null, veiculoId: string | null) {
  const queryClient = useQueryClient();

  const { data: abastecimentos = [], isLoading } = useQuery({
    queryKey: ["abastecimentos", userId, veiculoId],
    queryFn: async () => {
      if (!userId || !veiculoId) return [];
      const { data, error } = await supabase
        .from("abastecimentos")
        .select("*")
        .eq("user_id", userId)
        .eq("veiculo_id", veiculoId)
        .order("data", { ascending: true })
        .order("km_atual", { ascending: true });

      if (error) {
        console.error("Erro ao buscar abastecimentos:", error);
        return [];
      }
      return data as Abastecimento[];
    },
    enabled: Boolean(userId && veiculoId),
  });

  const addAbastecimento = useMutation({
    mutationFn: async (payload: { veiculo_id: string; data: string; km_atual: number; litros: number; valor_total: number }) => {
      if (!userId) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("abastecimentos")
        .insert({
          ...payload,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar km_atual do veículo se for maior
      await supabase
        .from("vehicles")
        .update({ km_atual: payload.km_atual })
        .eq("id", payload.veiculo_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abastecimentos"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle"] });
    },
  });

  return {
    abastecimentos,
    isLoading,
    addAbastecimento: addAbastecimento.mutateAsync,
    isAdding: addAbastecimento.isPending,
  };
}
