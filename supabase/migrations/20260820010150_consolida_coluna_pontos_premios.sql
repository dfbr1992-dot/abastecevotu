-- Consolida duas colunas redundantes de custo em pontos (0 linhas, sem risco de dado)
alter table public.premios drop column if exists custo_pontos;
alter table public.premios alter column pontos_necessarios set not null;
alter table public.premios add constraint premios_pontos_necessarios_check check (pontos_necessarios > 0);
alter table public.premios alter column exclusivo_premium set default false;
update public.premios set exclusivo_premium = false where exclusivo_premium is null;
alter table public.premios alter column exclusivo_premium set not null;
