import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MENSAGENS: Record<string, { status: number; mensagem: string }> = {
  nao_e_operador_ativo: { status: 403, mensagem: 'Você não está logado como operador ativo de nenhum posto.' },
  codigo_nao_encontrado: { status: 404, mensagem: 'Código não encontrado ou já utilizado.' },
  codigo_de_outro_posto: { status: 403, mensagem: 'Esse código pertence a outro posto.' },
  codigo_expirado: { status: 410, mensagem: 'Código expirado, peça um novo ao cliente.' },
  saldo_insuficiente: { status: 400, mensagem: 'Cliente não tem saldo de pontos suficiente.' },
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'nao_autenticado' }), { status: 401 });
  }

  let body: { codigo?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'corpo_invalido' }), { status: 400 });
  }

  const codigo = (body.codigo || '').trim();
  if (!codigo) {
    return new Response(JSON.stringify({ error: 'codigo_obrigatorio' }), { status: 400 });
  }

  // Chama a RPC com o JWT do próprio operador (não service_role) para que
  // auth.uid() dentro da função resolva corretamente para quem está logado.
  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await userClient.rpc('validar_resgate_codigo', { p_codigo: codigo });

  if (error) {
    const codigoErro = error.message?.split('\n')[0]?.trim() || 'erro_desconhecido';
    const conhecido = MENSAGENS[codigoErro];
    if (conhecido) {
      return new Response(JSON.stringify({ error: codigoErro, mensagem: conhecido.mensagem }), {
        status: conhecido.status,
      });
    }
    return new Response(JSON.stringify({ error: 'erro_interno', mensagem: 'Erro ao validar o código.' }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ sucesso: true, ...data }), { status: 200 });
});
