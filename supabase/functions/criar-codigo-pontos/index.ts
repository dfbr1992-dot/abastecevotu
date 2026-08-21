import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

// Edge Function: gerar código de resgate de prêmio.
// (O fluxo de 'ganho' foi substituído por crédito direto via email pelo
// frentista — creditar-pontos-por-email — e não é mais aceito aqui.)
// Única porta de INSERT em pontos_codigos pelo lado do usuário.
// Roda com o JWT do usuário autenticado — o user_id é derivado de auth.uid()
// (nunca do corpo da requisição), para impedir gerar código em nome de outro usuário.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CODIGO_EXPIRA_MIN = 10;
const MAX_TENTATIVAS_CODIGO = 5;

interface BodyEntrada {
  tipo?: string;
  posto_id?: string;
  premio_id?: string;
}

const ALLOWED_ORIGINS = [
  "https://abastecevotu.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "https://abastecevotuapp.dfbr1992.workers.dev",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Credentials"] = "true";
  }
  return h;
}

function gerarCodigo(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const num = ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) % 1000000;
  return num.toString().padStart(6, "0");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: {
        ...(origin && ALLOWED_ORIGINS.includes(origin)
          ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true" }
          : {}),
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, x-client-info, x-supabase-api-version, apikey, x-request-id",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo nao permitido" }), {
      status: 405,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Nao autenticado" }), {
      status: 401,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }
  const jwt = authHeader.slice("Bearer ".length);

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(jwt);
  if (verifyError || !user) {
    return new Response(JSON.stringify({ error: "Token invalido ou expirado" }), {
      status: 401,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }
  const userId = user.id;

  let body: BodyEntrada;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Corpo da requisicao invalido" }), {
      status: 400,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }

  const tipo = (body.tipo ?? "").toLowerCase();
  const postoId = (body.posto_id ?? "").trim();
  const premioId = (body.premio_id ?? "").trim();

  if (tipo === "ganho") {
    return new Response(
      JSON.stringify({ error: "Este fluxo nao usa mais codigo para ganhar pontos. O credito e feito pelo frentista via email no momento do abastecimento." }),
      { status: 400, headers: corsHeaders(req.headers.get("Origin")) },
    );
  }
  if (tipo !== "resgate") {
    return new Response(JSON.stringify({ error: "Tipo invalido. Use 'resgate'" }), {
      status: 400,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }
  if (!postoId) {
    return new Response(JSON.stringify({ error: "posto_id e obrigatorio" }), {
      status: 400,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }
  if (!premioId) {
    return new Response(JSON.stringify({ error: "premio_id e obrigatorio para resgate" }), {
      status: 400,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }

  const { data: posto, error: postoError } = await supabaseAdmin
    .from("postos")
    .select("id, nome")
    .eq("id", postoId)
    .single();
  if (postoError || !posto) {
    return new Response(JSON.stringify({ error: "Posto invalido" }), {
      status: 400,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }

  const { data: premioRow, error: premioError } = await supabaseAdmin
    .from("premios")
    .select("id, pontos_necessarios, posto_id, exclusivo_premium")
    .eq("id", premioId)
    .eq("ativo", true)
    .eq("posto_id", postoId)
    .maybeSingle();

  if (premioError || !premioRow) {
    return new Response(JSON.stringify({ error: "Premio indisponivel ou nao pertence a este posto" }), {
      status: 400,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }

  if (premioRow.exclusivo_premium) {
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from("profiles")
      .select("is_premium")
      .eq("id", userId)
      .single();
    if (perfilError || !perfil?.is_premium) {
      return new Response(JSON.stringify({ error: "Este premio e exclusivo para assinantes Abastece+ Pro" }), {
        status: 403,
        headers: corsHeaders(req.headers.get("Origin")),
      });
    }
  }

  const custo = premioRow.pontos_necessarios;
  if (!custo || custo <= 0) {
    return new Response(JSON.stringify({ error: "Premio com custo de pontos invalido" }), {
      status: 500,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }

  const { data: saldoRow, error: saldoError } = await supabaseAdmin
    .from("saldo_pontos_por_posto")
    .select("saldo")
    .eq("user_id", userId)
    .eq("posto_id", postoId)
    .maybeSingle();

  if (saldoError) {
    console.error("Erro ao consultar saldo:", saldoError.message);
    return new Response(JSON.stringify({ error: "Falha ao consultar saldo de pontos" }), {
      status: 500,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }
  const saldo = (saldoRow?.saldo as number) ?? 0;
  if (saldo < custo) {
    return new Response(JSON.stringify({ error: "Saldo insuficiente" }), {
      status: 400,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }

  const quantidadePontos = custo;

  const { error: cancelError } = await supabaseAdmin
    .from("pontos_codigos")
    .update({ status: "cancelado" })
    .eq("user_id", userId)
    .eq("posto_id", postoId)
    .eq("tipo", "resgate")
    .eq("status", "pendente")
    .gt("expira_em", new Date().toISOString());

  if (cancelError) {
    console.error("Erro ao cancelar codigo anterior:", cancelError.message);
  }

  const now = new Date();
  const expiraEm = new Date(now.getTime() + CODIGO_EXPIRA_MIN * 60 * 1000);
  let codigoGerado: string | null = null;

  for (let tentativa = 0; tentativa < MAX_TENTATIVAS_CODIGO; tentativa += 1) {
    const codigo = gerarCodigo();
    const { error: insertError } = await supabaseAdmin
      .from("pontos_codigos")
      .insert({
        user_id: userId,
        posto_id: postoId,
        tipo: "resgate",
        codigo,
        premio_id: premioId,
        quantidade_pontos: quantidadePontos,
        status: "pendente",
        expira_em: expiraEm.toISOString(),
        usado_em: null,
        usado_por: null,
      });

    if (!insertError) {
      codigoGerado = codigo;
      break;
    }
    console.warn(`Colisao de codigo na tentativa ${tentativa + 1}:`, insertError.message);
  }

  if (!codigoGerado) {
    return new Response(JSON.stringify({ error: "Falha ao gerar codigo. Tente novamente." }), {
      status: 500,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }

  return new Response(
    JSON.stringify({ codigo: codigoGerado, tipo: "resgate", expira_em: expiraEm.toISOString(), quantidade_pontos: quantidadePontos }),
    { status: 200, headers: corsHeaders(req.headers.get("Origin")) },
  );
});
