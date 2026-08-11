create table if not exists public.abastecimentos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  veiculo_id uuid references public.vehicles(id) on delete cascade not null,
  data date not null default current_date,
  km_atual numeric not null,
  litros numeric not null,
  valor_total numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.abastecimentos enable row level security;

create policy "Users can view their own abastecimentos"
  on public.abastecimentos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own abastecimentos"
  on public.abastecimentos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own abastecimentos"
  on public.abastecimentos for update
  using (auth.uid() = user_id);

create policy "Users can delete their own abastecimentos"
  on public.abastecimentos for delete
  using (auth.uid() = user_id);

create index if not exists idx_abastecimentos_user_veiculo on public.abastecimentos(user_id, veiculo_id);
create index if not exists idx_abastecimentos_data on public.abastecimentos(data);
