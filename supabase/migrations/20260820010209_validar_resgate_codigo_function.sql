create or replace function public.validar_resgate_codigo(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_posto_operador uuid;
  v_linha public.pontos_codigos%rowtype;
begin
  v_posto_operador := public.posto_do_operador_atual();
  if v_posto_operador is null then
    raise exception 'nao_e_operador_ativo';
  end if;

  select * into v_linha
  from public.pontos_codigos
  where codigo = p_codigo
    and tipo = 'resgate'
    and status = 'pendente'
  for update;

  if not found then
    raise exception 'codigo_nao_encontrado';
  end if;

  if v_linha.posto_id <> v_posto_operador then
    raise exception 'codigo_de_outro_posto';
  end if;

  if v_linha.expira_em < now() then
    update public.pontos_codigos set status = 'expirado' where id = v_linha.id;
    raise exception 'codigo_expirado';
  end if;

  if (select saldo from public.saldo_pontos_por_posto
      where user_id = v_linha.user_id and posto_id = v_linha.posto_id) < v_linha.quantidade_pontos then
    raise exception 'saldo_insuficiente';
  end if;

  insert into public.pontos_transacoes (user_id, posto_id, tipo, quantidade, motivo, codigo_id, criado_por)
  values (v_linha.user_id, v_linha.posto_id, 'debito', v_linha.quantidade_pontos, 'resgate_premio', v_linha.id, auth.uid());

  update public.pontos_codigos
    set status = 'usado', usado_em = now(), usado_por = auth.uid()
    where id = v_linha.id;

  return jsonb_build_object(
    'quantidade_pontos', v_linha.quantidade_pontos,
    'premio_id', v_linha.premio_id
  );
end;
$$;

revoke execute on function public.validar_resgate_codigo(text) from public, anon;
grant execute on function public.validar_resgate_codigo(text) to authenticated;
