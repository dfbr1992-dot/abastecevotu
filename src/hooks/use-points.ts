import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type LedgerEntry = {
  id: string;
  delta: number;
  descricao: string;
  created_at: string;
};

export function usePoints(userId: string | null) {
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading: loading, refetch: refresh } = useQuery({
    queryKey: ["points", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("points_ledger")
        .select("id,delta,descricao,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data ?? []) as LedgerEntry[];
    },
    enabled: !!userId,
  });

  const balance = entries.reduce((s, e) => s + e.delta, 0);

  const awardForAction = useCallback(
    async (action: "confirm_price") => {
      if (!userId) return;
      const { error } = await (supabase.rpc as any)("award_points_for_action", { _action: action });
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["points", userId] });
      }
    },
    [userId, queryClient]
  );

  return { entries, balance, loading, refresh, awardForAction };
}
