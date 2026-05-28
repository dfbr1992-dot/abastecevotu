
## Objetivo

Conectar a página `/login` existente ao fluxo do app principal (`/`), exibindo estado de autenticação no header, protegendo ações críticas e redirecionando o usuário após o login. Sem alterar o design atual.

## 1. Hook de sessão pública (`src/hooks/use-auth.ts`)

Novo hook leve baseado em `supabase.auth`:

- Inicializa com `supabase.auth.onAuthStateChange` (antes do `getSession`).
- Retorna `{ session, user, loading, signOut }`.
- `user.displayName` derivado de `user.user_metadata.full_name` ou da parte antes do `@` do e-mail.
- Usado tanto no `index.tsx` quanto na `/login`.

(Não usamos `use-admin-auth` porque ele verifica role admin — para o app público basta sessão.)

## 2. Header em `src/routes/index.tsx`

Substituir o bloco do botão "Entrar" (linhas ~163-176):

- Se `!user`: botão atual "➔ Entrar" → `navigate({ to: "/login", search: { redirect: "/" } })`.
- Se `user`: dropdown (Radix `DropdownMenu` já disponível) com gatilho mostrando avatar circular (iniciais) + primeiro nome. Itens: "Meus Prêmios" (abre modal `premios`), "Sair" (chama `signOut` + toast "Você saiu").
- Manter o botão VotuPass intocado visualmente, mas seu `onClick` passa pela guarda (item 3).

Remover o `Modal` inline `modal === "login"` (linhas 544-562) e o valor `"login"` do tipo `Modal` — agora a página `/login` cuida disso.

## 3. Guardas de ação protegida

Criar helper local `requireAuth(action: () => void, msg?: string)`:

```ts
const requireAuth = (action: () => void, msg = "Faça login para continuar") => {
  if (!user) {
    fireToast(msg);
    setTimeout(() => navigate({ to: "/login", search: { redirect: "/" } }), 600);
    return;
  }
  action();
};
```

Aplicar em:

- Botão "Confirmar preço" de cada posto (linha ~341): envolver o `onClick` em `requireAuth`.
- Tile "VotuPass" no header e card do modal "Assinar via Pix" (linha ~444).
- Botão "Agendar" de cada serviço (linha ~405).
- Widget "📊 Flex" → liberado (cálculo público).
- Widget "🚗 Meu Carro" → protegido (dados pessoais).

Nada muda visualmente; só a ação fica gated.

## 4. Página `/login`

Reescrever `submit()` em `src/routes/login.tsx` para autenticar de verdade:

- Modo `login`: `supabase.auth.signInWithPassword({ email, password })`.
- Modo `signup`: `supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })`.
- Tratar erros com `toast.error`.
- Em sucesso: ler `search.redirect` (default `/`) e `navigate({ to: redirect })`.

Adicionar `validateSearch` ao `createFileRoute` para tipar `redirect: string`:

```ts
validateSearch: (s: Record<string, unknown>) => ({
  redirect: typeof s.redirect === "string" ? s.redirect : "/",
}),
```

Manter o design atual (gradiente deep blue, card branco). Remover o bypass de localStorage e o subtítulo "(Bypass Total Ativo)".

Adicionar alternância login ↔ cadastro (link "Criar conta" / "Já tenho conta") usando o `mode` que já existe no state.

## 5. Auth do app principal (Cloud)

Verificar via `configure_auth` que:
- `disable_signup: false`
- `auto_confirm_email: true` (para fluxo simples de cadastro+entrada imediata, conforme convenção do app público — admin é caso separado).
- `external_anonymous_users_enabled: false`
- `password_hibp_enabled: true`

## Fora de escopo

- Reset de senha (não pedido).
- Login social Google (não pedido — pode ser adicionado depois).
- Alterar painel `/admin` ou hook `use-admin-auth`.
- Mudanças de design / layout do app.

## Arquivos afetados

- **Criar:** `src/hooks/use-auth.ts`.
- **Editar:** `src/routes/index.tsx` (header, guardas, remover modal login), `src/routes/login.tsx` (auth real + redirect).
- **Config:** `supabase--configure_auth`.
