import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  registerPushNotifications,
  adoptPushSubscriptionOnLogin,
} from "@/lib/push-service";

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  nome: string | null;
  is_premium: boolean;
  is_admin: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isPremium: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  displayName: string;
  initials: string;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Provider único, montado uma vez na raiz do app (ver src/routes/__root.tsx).
// Mantém uma única inscrição em supabase.auth.onAuthStateChange e um único
// registro de push notifications. Antes disso era um hook comum: cada
// componente que chamava useAuth() (inclusive o <AccessControl> repetido
// para cada posto da lista) criava sua PRÓPRIA inscrição e disparava
// registerPushNotifications() de novo, gerando dezenas de listeners
// duplicados e o aviso "Multiple GoTrueClient instances".
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let adopted = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoadingAuth(false);
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });

      if (s?.user?.id) {
        // Atualiza a inscrição push com o usuário logado e adota a
        // inscrição anônima (device_id) para não perder o registro pré-login.
        registerPushNotifications(s.user.id);
        if (!adopted) {
          adopted = true;
          adoptPushSubscriptionOnLogin();
        }
      } else {
        // Fora da sessão: registra a inscrição push anônima (pré-login),
        // com pedido de permissão de notificação na primeira carga.
        registerPushNotifications();
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingAuth(false);

      if (data.session?.user?.id) {
        registerPushNotifications(data.session.user.id);
        adoptPushSubscriptionOnLogin();
      } else {
        registerPushNotifications();
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const user = session?.user ?? null;

  // Busca os dados do perfil (tabela profiles) usando React Query
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar perfil:", error);
        return null;
      }
      return data as UserProfile;
    },
    enabled: !!user?.id, // Só roda se o usuário estiver logado
  });

  const displayName = getDisplayName(user, profile);

  // Níveis de acesso baseados no perfil
  const isPremium = !!profile?.is_premium;
  const isAdmin = !!profile?.is_admin;
  const isAuthenticated = !!user;

  const value: AuthContextValue = {
    session,
    user,
    profile: profile ?? null,
    isPremium,
    isAdmin,
    isAuthenticated,
    loading: loadingAuth || (!!user && loadingProfile),
    displayName,
    initials: getInitials(displayName),
    signOut: async () => {
      await supabase.auth.signOut();
      queryClient.setQueryData(["user-profile", user?.id], null);
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() precisa ser usado dentro de <AuthProvider>");
  }
  return ctx;
}

function getDisplayName(user: User | null, profile: UserProfile | null | undefined): string {
  if (profile?.full_name) return profile.full_name;
  if (profile?.nome) return profile.nome;
  if (!user) return "";
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  return meta?.full_name || meta?.name || user.email?.split("@")[0] || "Usuário";
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || name[0].toUpperCase();
}
