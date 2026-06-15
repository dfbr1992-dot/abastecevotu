import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Fórmula de Haversine — calcula distância em km entre dois pontos
function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Pega localização do usuário (retorna centro de Votuporanga se negar)
function getUserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      return resolve({ lat: -20.4222, lng: -49.9733 });
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: -20.4222, lng: -49.9733 }), // fallback se negar
      { timeout: 5000 }
    );
  });
}

export function usePostos() {
  return useQuery({
    queryKey: ["postos"],
    queryFn: async () => {
      const [{ data, error }, userLocation] = await Promise.all([
        supabase.from("postos").select("*, precos(*)").eq("ativo", true),
        getUserLocation(),
      ]);

      if (error) throw error;

      return data.map((p) => {
        const distance =
          p.lat && p.lng
            ? parseFloat(calcDistance(userLocation.lat, userLocation.lng, p.lat, p.lng).toFixed(1))
            : null;

        return {
          ...p,
          name: p.nome,
          address: p.endereco,
          hours: `${p.horario_abertura} — ${p.horario_fechamento}`,
          lat: p.lat,
          lng: p.lng,
          distance,
          prices: {
            etanol: p.precos?.find((pr: any) => pr.combustivel === "etanol")?.valor || 0,
            gasolina: p.precos?.find((pr: any) => pr.combustivel === "gasolina_comum")?.valor || 0,
            diesel: p.precos?.find((pr: any) => pr.combustivel === "diesel")?.valor || 0,
          },
        };
      });
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
        .eq("ativo", true);

      if (error) throw error;

      return data.map((s) => ({
        name: s.nome_servico,
        empresa_nome: s.nome,
        address: s.endereco,
        hours: s.horario,
        price: s.preco,
        categoria: s.categoria,
        destaque: s.destaque,
        ordem: s.ordem,
        whatsapp: s.whatsapp,
      }));
    },
  });
}