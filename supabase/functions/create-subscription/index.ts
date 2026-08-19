import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MP_BASE = "https://api.mercadopago.com/preapproval";
const SUBSCRIPTION_VALUE = 9.9;

interface MpPreapprovalResponse {
  id?: string;
  init_point?: string;
  status?: string;
  message?: string;
  error?: string;
}

async function getMpAccessToken(): Promise<string> {
  const clientId = Deno.env.get("MERCADOPAGO_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("MERCADOPAGO_CLIENT_SECRET") ?? "";
  const fallbackToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ?? "";
  if (!clientId || !clientSecret) {
    if (fallbackToken) return fallbackToken;
    throw new Error("Credenciais Mercado Pago nao configuradas");
  }
  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }).toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Falha ao obter token Mercado Pago (HTTP ${res.status}): ${t}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Resposta sem access_token do Mercado Pago");
  return data.access_token;
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

serve(async (req) => {
  // CORS preflight
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

  // Apenas POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo nao permitido" }), {
      status: 405,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }

  // Autenticacao via JWT do usuario
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Nao autenticado" }), {
      status: 401,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }
  const jwt = authHeader.slice("Bearer ".length);

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verificar JWT e extrair user_id (nunca confiar em body)
  const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(jwt);
  if (verifyError || !user) {
    return new Response(JSON.stringify({ error: "Token invalido ou expirado" }), {
      status: 401,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }
  const userId = user.id;

  // Obter token de acesso do Mercado Pago (client_credentials com fallback)
  let mpToken: string;
  try {
    mpToken = await getMpAccessToken();
  } catch (err) {
    console.error("Erro ao obter token MP:", err);
    return new Response(JSON.stringify({ error: "Falha ao autenticar no Mercado Pago" }), {
      status: 502,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }

  // Criar assinatura recorrente mensal no Mercado Pago
  const now = new Date();
  const body = {
    reason: "Assinatura Abastece+ Pro",
    external_reference: userId,
    payer_email: user.email ?? "",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      repetitions: 12,
      transaction_amount: SUBSCRIPTION_VALUE,
      currency_id: "BRL",
      start_date: now.toISOString(),
      end_date: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString(),
    },
    back_url: "https://abastecevotu.app",
    status: "pending",
  };

  const mpRes = await fetch(MP_BASE, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${mpToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `sub-${userId}-${Date.now()}`,
    },
    body: JSON.stringify(body),
  });

  const mpData = (await mpRes.json()) as MpPreapprovalResponse;

  if (!mpRes.ok || !mpData.id || !mpData.init_point) {
    console.error("Erro ao criar preapproval no Mercado Pago:", JSON.stringify(mpData));
    return new Response(JSON.stringify({ error: "Falha ao criar assinatura no Mercado Pago" }), {
      status: 502,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }

  // Registrar na tabela assinaturas (status pending)
  const { error: insertError } = await supabaseAdmin
    .from("assinaturas")
    .insert({
      user_id: userId,
      mp_subscription_id: mpData.id,
      status: "pending",
      valor: SUBSCRIPTION_VALUE,
      data_inicio: now.toISOString(),
    });

  if (insertError) {
    console.error("Erro ao inserir assinatura:", insertError.message);
    return new Response(JSON.stringify({ error: "Falha ao registrar assinatura" }), {
      status: 500,
      headers: corsHeaders(req.headers.get("Origin")),
    });
  }

  return new Response(JSON.stringify({ init_point: mpData.init_point, mp_subscription_id: mpData.id }), {
    status: 200,
    headers: corsHeaders(req.headers.get("Origin")),
  });
});
