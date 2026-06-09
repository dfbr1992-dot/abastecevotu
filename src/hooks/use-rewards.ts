import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type Reward = {
  id: string;
  nome: string;
  descricao: string | null;
  custo_pontos: number;
  emoji: string | null;
};

export function useRewards() {
  const { data: rewards = [] } = useQuery({
    queryKey: ["rewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("id,nome,descricao,custo_pontos,emoji")
        .eq("ativo", true)
        .order("custo_pontos", { ascending: true });
      
      if (error) throw error;
      return (data ?? []) as Reward[];
    },
  });

  return rewards;
}

export function usePremium(userId: string | null) {
  const { data: isPremium = false, refetch: refreshPremium } = useQuery({
    queryKey: ["isPremium", userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", userId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data?.is_premium;
    },
    enabled: !!userId,
  });

  return { isPremium, setIsPremium: refreshPremium };
}
