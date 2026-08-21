-- banners.prioridade é integer, mas o formulário do admin sempre gravou
-- "topo"/"meio"/"popup" nela (posição de exibição, não ordem numérica).
-- Todo insert/update falhava com erro de tipo — a tabela nunca teve uma
-- linha salva com sucesso. Investigação confirmou que nenhum app cliente
-- lê essa coluna hoje (é uma feature ainda sem consumidor), então isto só
-- corrige o schema para o formulário funcionar e prepara a base para
-- quando o carrossel de banners for construído no cliente.
alter table public.banners
  add column posicao text not null default 'topo'
    check (posicao in ('topo', 'meio', 'popup'));

comment on column public.banners.posicao is 'Onde o banner aparece no app: topo, meio ou popup';
comment on column public.banners.prioridade is 'Ordem de exibição entre banners da mesma posição (menor primeiro). Sem UI de ordenação ainda — sempre 0.';
