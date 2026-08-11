import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type PostoServicos = Database['public']['Tables']['posto_servicos']['Row'];

export function usePostoServicos(postoId: string) {
  return useQuery({
    queryKey: ['posto_servicos', postoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posto_servicos')
        .select('*')
        .eq('posto_id', postoId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!postoId,
    staleTime: 5 * 60 * 1000,
  });
}
