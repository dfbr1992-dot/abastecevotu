import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, DollarSign, Wrench, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function useCount(table: "postos" | "servicos" | "banners" | "precos") {
  return useQuery({
    queryKey: ["count", table],
    queryFn: async () => {
      const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });
}

function AdminDashboard() {
  const postos = useCount("postos");
  const precos = useCount("precos");
  const servicos = useCount("servicos");
  const banners = useCount("banners");

  const cards = [
    { to: "/admin/postos", label: "Postos", icon: MapPin, count: postos.data, color: "bg-emerald-500" },
    { to: "/admin/precos", label: "Preços", icon: DollarSign, count: precos.data, color: "bg-blue-500" },
    { to: "/admin/servicos", label: "Serviços", icon: Wrench, count: servicos.data, color: "bg-amber-500" },
    { to: "/admin/banners", label: "Banners", icon: ImageIcon, count: banners.data, color: "bg-purple-500" },
  ] as const;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white md:text-3xl">Dashboard</h1>
      <p className="text-muted-foreground mb-6">Visão geral do hub de gestão.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.to} to={c.to} className="glass-card group rounded-2xl p-5 transition-shadow hover:shadow-lg hover:shadow-black/30">
              <div className={`w-10 h-10 rounded-xl ${c.color} text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-white">{c.count ?? "—"}</div>
              <div className="text-sm text-muted-foreground">{c.label}</div>
            </Link>
          );
        })}
      </div>

      <div className="glass-card mt-8 rounded-2xl p-6">
        <h2 className="mb-2 font-semibold text-white">Bem-vindo ao painel</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie postos, atualize preços em tempo real, cadastre parceiros e publique anúncios.
          Use o menu lateral para navegar entre os módulos.
        </p>
      </div>
    </div>
  );
}
