import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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

  const setIsPremium = (val: boolean) => {
    refreshPremium();
  };

  return { isPremium, setIsPremium };
}
