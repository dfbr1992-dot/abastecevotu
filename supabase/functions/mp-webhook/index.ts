import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

function corsHeaders(origin: string | null) {
  const originOk = origin === "https://mp-webhook-proxy.dfbr1992.workers.dev" || (origin?.endsWith(".abastecevotu.app") ?? false);
  return {
    "Content-Type": "application/json",
    ...(originOk
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "x-signature, x-request-id, content-type, authorization, x-client-info, x-supabase-api-version, apikey",
          "Access-Control-Max-Age": "86400",
        }
      : {}),
  };
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MP_BASE = "https://api.mercadopago.com/preapproval";

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

interface MpPreapprovalDetail {
  id?: string;
  status?: string;
  external_reference?: string;
  auto_recurring?: { next_payment_date?: string };
  message?: string;
  error?: string;
}

async function processWebhook(supabaseAdmin: ReturnType<typeof createClient>, body: unknown, xSignature: string) {
  const raw = body as Record<string, unknown>;
  const eventType = (raw?.type ?? raw?.topic ?? "unknown") as string;
  const dataId = (raw?.data?.id ?? raw?.id) as string | undefined;

  // Registrar evento bruto
  await supabaseAdmin.from("mp_webhook_events").insert({
    event_type: eventType,
    mp_subscription_id: dataId ?? null,
    payload: body,
    processed: false,
  });

  if (eventType !== "preapproval" || !dataId) {
    // Evento nao relacionado a assinaturas: marcar como processado e responder ok
    await supabaseAdmin
      .from("mp_webhook_events")
      .update({ processed: true })
      .eq("mp_subscription_id", dataId ?? null);
    return;
  }

  // Buscar detalhes atualizados diretamente na API do Mercado Pago
  let mpToken: string;
  try {
    mpToken = await getMpAccessToken();
  } catch (err) {
    console.error("Erro ao obter token MP no webhook:", err);
    await supabaseAdmin
      .from("mp_webhook_events")
      .update({ processed: false, error: `Falha ao obter token MP: ${(err as Error).message}` })
      .eq("mp_subscription_id", dataId);
    return;
  }
  const detailRes = await fetch(`${MP_BASE}/${encodeURIComponent(dataId)}`, {
    headers: { "Authorization": `Bearer ${mpToken}` },
  });
  const detail = (await detailRes.json()) as MpPreapprovalDetail;

  if (!detailRes.ok || !detail.status) {
    await supabaseAdmin
      .from("mp_webhook_events")
      .update({ processed: false, error: `Falha ao buscar preapproval ${dataId}: ${detail?.message ?? "HTTP " + detailRes.status}` })
      .eq("mp_subscription_id", dataId);
    return;
  }

  const mpStatus = detail.status;
  const nextPaymentDate = detail.auto_recurring?.next_payment_date ?? null;

  const update: Record<string, unknown> = {};

  if (mpStatus === "authorized") {
    update.status = "authorized";
    update.data_proxima_cobranca = nextPaymentDate;
    update.data_cancelamento = null;
    // Ativar premium no profiles
    const userId = detail.external_reference ?? (await lookupUserBySubscription(supabaseAdmin, dataId));
    if (userId) {
      await supabaseAdmin.from("profiles").update({ is_premium: true }).eq("id", userId);
    }
  } else if (mpStatus === "cancelled") {
    update.status = "cancelled";
    update.data_cancelamento = new Date().toISOString();
    // Nao revoga acesso premium imediatamente: mantem ate data_proxima_cobranca
  } else if (mpStatus === "paused") {
    update.status = "paused";
  } else if (mpStatus === "pending") {
    update.status = "pending";
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabaseAdmin
      .from("assinaturas")
      .update(update)
      .eq("mp_subscription_id", dataId);
    if (error) {
      await supabaseAdmin
        .from("mp_webhook_events")
        .update({ processed: false, error: error.message })
        .eq("mp_subscription_id", dataId);
      return;
    }
  }

  await supabaseAdmin
    .from("mp_webhook_events")
    .update({ processed: true })
    .eq("mp_subscription_id", dataId);
}

async function lookupUserBySubscription(supabaseAdmin: ReturnType<typeof createClient>, mpSubscriptionId: string) {
  const { data } = await supabaseAdmin
    .from("assinaturas")
    .select("user_id")
    .eq("mp_subscription_id", mpSubscriptionId)
    .maybeSingle();
  return data?.user_id ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("Origin")) });
  }
  if (req.method !== "POST") {
    return new Response("Metodo nao permitido", { status: 405, headers: corsHeaders(req.headers.get("Origin")) });
  }

  // Validacao via HMAC (x-signature) do Mercado Pago
  const xSignature = req.headers.get("x-signature") ?? "";
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") ?? "";
  const parts = xSignature.split(",").map((p) => p.trim());

  // Formato esperado: ts=<timestamp>,v1=<hash>
  const tsParam = parts.find((p) => p.startsWith("ts="));
  const v1Param = parts.find((p) => p.startsWith("v1="));

  if (!tsParam || !v1Param) {
    return new Response("Assinatura ausente", { status: 401, headers: corsHeaders(req.headers.get("Origin")) });
  }

  const tsValue = tsParam.slice(3);
  const v1Value = v1Param.slice(3);

  const appId = (Deno.env.get("MERCADOPAGO_APP_ID") ?? "").trim();
  const isPlaceholder = appId.startsWith("TMP_FILL_") || !appId;
  if (isPlaceholder) {
    // Secret/appId ainda nao configurados: rejeitar para nao aceitar webhook falsificado
    return new Response("Validacao HMAC ainda nao configurada (APP_ID ausente)", { status: 401, headers: corsHeaders(req.headers.get("Origin")) });
  }

  // Manifest oficial do SDK WebhookSignatureValidator do Mercado Pago:
  // "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" (pares ausentes sao omitidos)
  const xRequestId = req.headers.get("x-request-id") ?? "";
  const partsPayload: string[] = [];
  if (dataId) partsPayload.push(`id:${dataId}`);
  if (xRequestId) partsPayload.push(`request-id:${xRequestId}`);
  partsPayload.push(`ts:${tsValue}`);
  const signedPayload = `${partsPayload.join(";")};`;

  const secret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET")!;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (sigHex !== v1Value) {
    return new Response("Assinatura invalida", { status: 401, headers: corsHeaders(req.headers.get("Origin")) });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const body = await req.json().catch(() => null);

  if (!body) {
    return new Response("Payload invalido", { status: 400, headers: corsHeaders(req.headers.get("Origin")) });
  }

  // Processar assincronamente (fire-and-forget controlado) e responder 200 rapido
  processWebhook(supabaseAdmin, body, xSignature).catch((err) => {
    console.error("Erro no processamento do webhook:", err);
  });

  return new Response("OK", { status: 200, headers: corsHeaders(req.headers.get("Origin")) });
});
