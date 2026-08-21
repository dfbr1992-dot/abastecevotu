import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function mascaraEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visivel = user.slice(0, 1);
  return `${visivel}${'*'.repeat(Math.max(user.length - 1, 1))}@${domain}`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'nao_autenticado' }), { status: 401 });
  }

  // Client com o JWT do operador, para identificar quem ele é
  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'nao_autenticado' }), { status: 401 });
  }

  // Client privilegiado para checagens e escrita
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: operador, error: operadorError } = await adminClient
    .from('operadores_turno')
    .select('posto_id')
    .eq('user_id', userData.user.id)
    .eq('ativo', true)
    .maybeSingle();

  if (operadorError || !operador) {
    return new Response(JSON.stringify({ error: 'nao_e_operador_ativo' }), { status: 403 });
  }

  let body: { email?: string; valor_gasto?: number; confirmar?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'corpo_invalido' }), { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const valorGasto = body.valor_gasto;
  const confirmar = body.confirmar === true;

  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'email_invalido' }), { status: 400 });
  }
  if (typeof valorGasto !== 'number' || valorGasto <= 0) {
    return new Response(JSON.stringify({ error: 'valor_gasto_invalido' }), { status: 400 });
  }

  const { data: cliente, error: clienteError } = await adminClient
    .from('profiles')
    .select('id, email, full_name, display_name, nome')
    .eq('email', email)
    .maybeSingle();

  if (clienteError || !cliente) {
    return new Response(JSON.stringify({ error: 'cliente_nao_encontrado' }), { status: 404 });
  }

  const { data: posto, error: postoError } = await adminClient
    .from('postos')
    .select('pontos_por_real, nome')
    .eq('id', operador.posto_id)
    .single();

  if (postoError || !posto) {
    return new Response(JSON.stringify({ error: 'posto_invalido' }), { status: 500 });
  }

  const pontosCalculados = Math.round(valorGasto * Number(posto.pontos_por_real));
  const nomeCliente = cliente.display_name || cliente.full_name || cliente.nome || 'Cliente';

  if (!confirmar) {
    // Modo pré-visualização: não grava nada, só mostra pro frentista confirmar
    return new Response(
      JSON.stringify({
        preview: true,
        nome_cliente: nomeCliente,
        email_mascarado: mascaraEmail(cliente.email),
        pontos_a_creditar: pontosCalculados,
        posto: posto.nome,
      }),
      { status: 200 },
    );
  }

  const { error: insertError } = await adminClient.from('pontos_transacoes').insert({
    user_id: cliente.id,
    posto_id: operador.posto_id,
    tipo: 'credito',
    quantidade: pontosCalculados,
    motivo: 'abastecimento',
    valor_gasto: valorGasto,
    criado_por: userData.user.id,
  });

  if (insertError) {
    return new Response(JSON.stringify({ error: 'erro_ao_creditar' }), { status: 500 });
  }

  return new Response(
    JSON.stringify({
      sucesso: true,
      nome_cliente: nomeCliente,
      pontos_creditados: pontosCalculados,
    }),
    { status: 200 },
  );
});
