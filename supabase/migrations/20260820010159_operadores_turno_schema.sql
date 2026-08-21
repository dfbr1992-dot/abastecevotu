create table public.operadores_turno (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id),
  posto_id uuid not null references public.postos(id),
  turno text not null check (turno in ('manha','tarde','noite')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index operadores_turno_posto_turno_ativo_idx
  on public.operadores_turno (posto_id, turno)
  where ativo = true;

alter table public.operadores_turno enable row level security;

create policy "operador ve a propria linha"
  on public.operadores_turno for select
  using (auth.uid() = user_id);

-- Nenhuma policy de insert/update/delete para authenticated:
-- contas de operador são criadas manualmente (Supabase Studio/service_role), sem self-signup.

create or replace function public.posto_do_operador_atual()
returns uuid
language sql
security definer
set search_path = public
as $$
  select posto_id from public.operadores_turno
  where user_id = auth.uid() and ativo = true
  limit 1
$$;
