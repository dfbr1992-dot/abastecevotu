import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, MapPin, DollarSign, Wrench, Image as ImageIcon, LogOut, Fuel, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Admin — Abastece Votu" }, { name: "robots", content: "noindex" }] }),
});

const nav: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/postos", label: "Postos", icon: MapPin },
  { to: "/admin/precos", label: "Preços", icon: DollarSign },
  { to: "/admin/servicos", label: "Serviços", icon: Wrench },
  { to: "/admin/banners", label: "Banners", icon: ImageIcon },
];

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isAdmin, loading } = useAdminAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login", search: { redirect: "/admin" } });
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="glass-card max-w-md rounded-2xl p-8 text-center">
          <h1 className="mb-2 text-xl font-bold text-white">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground mb-6">
            A sua conta não tem permissão de administrador para acessar este painel.
          </p>
          <Button onClick={() => navigate({ to: "/" })}>Voltar para o início</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="bg-card text-white md:flex md:min-h-screen md:w-64 md:flex-col md:border-r md:border-white/10">
        <div className="flex items-center gap-2 border-b border-white/10 p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-premium-gradient">
            <Fuel className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold leading-tight">Abastece Votu</div>
            <div className="text-xs text-white/60">Painel administrativo</div>
          </div>
        </div>
        <nav className="flex md:flex-col gap-1 p-3 overflow-x-auto">
          {nav.map((n) => {
            const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-premium-gradient text-white" : "text-white/80 hover:bg-white/5"}`}
              >
                <Icon className="w-4 h-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:block mt-auto p-3 border-t border-white/10">
          <div className="text-xs text-white/60 mb-2 truncate">{session.user.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-white/80 hover:bg-white/5 hover:text-white" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}>
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
