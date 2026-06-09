import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePostos() {
  return useQuery({
    queryKey: ["postos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('postos')
        .select('*, precos(*)')
        .eq('ativo', true);
      
      if (error) throw error;
      
      return data.map(p => ({
        ...p,
        name: p.nome,
        address: p.endereco,
        hours: `${p.horario_abertura} — ${p.horario_fechamento}`,
        prices: {
          etanol: p.precos?.find((pr: any) => pr.combustivel === 'etanol')?.valor || 0,
          gasolina: p.precos?.find((pr: any) => pr.combustivel === 'gasolina_comum')?.valor || 0,
          diesel: p.precos?.find((pr: any) => pr.combustivel === 'diesel')?.valor || 0
        }
      }));
    },
  });
}

export function useServicos() {
  return useQuery({
    queryKey: ["servicos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicos")
        .select("nome, nome_servico, endereco, horario, preco, categoria, destaque, ordem, whatsapp")
        .eq('ativo', true);
      
      if (error) throw error;
      
      return data.map(s => ({
        name: s.nome_servico,
        empresa_nome: s.nome,
        address: s.endereco,
        hours: s.horario,
        price: s.preco,
        categoria: s.categoria,
        destaque: s.destaque,
        ordem: s.ordem,
        whatsapp: s.whatsapp
      }));
    },
  });
}
