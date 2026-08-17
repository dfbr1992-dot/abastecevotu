import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import webpush from "npm:web-push@3.6.7";

// Edge Function chamada pelo Database Webhook (Supabase) quando:
//   1) um novo usuário cria conta   -> type: 'novo_cadastro'
//   2) um usuário vira assinante Pro -> type: 'nova_assinatura'
// Ela envia push para todos os admins optados em admin_push_subscriptions e
// grava a entrada no inbox admin_notifications.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails(
  "mailto:seu-email@dominio.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

type EventType = "novo_cadastro" | "nova_assinatura";

const ADMIN_TITLES: Record<EventType, string> = {
  novo_cadastro: "Novo cadastro no Abastece Votu",
  nova_assinatura: "Novo assinante Abastece+ Pro",
};

serve(async (req) => {
  console.log("notify-admin-event iniciada");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const payload = await req.json();
    console.log("Payload recebido:", JSON.stringify(payload));

    // payload pode vir do webhook ({ record: { ... }, type: 'INSERT'|'UPDATE' })
    // ou de chamada direta ({ type: 'novo_cadastro'|'nova_assinatura' }).
    const webhookType = payload.type;
    const isWebhook = webhookType === "INSERT" || webhookType === "UPDATE";
    const record = isWebhook ? (payload.record ?? {}) : payload;
    let type: EventType;
    if (webhookType === "UPDATE") type = "nova_assinatura";
    else if (isWebhook) type = "novo_cadastro";
    else if (["novo_cadastro", "nova_assinatura"].includes(webhookType)) type = webhookType as EventType;
    else type = inferEventType(record);
    const userId = record.id ?? record.user_id ?? null;
    const email = record.email ?? null;

    if (!["novo_cadastro", "nova_assinatura"].includes(type)) {
      return new Response(JSON.stringify({ error: "type inválido" }), { status: 400 });
    }

    // 1) Buscar inscrições push dos admins.
    const { data: subs, error: subError } = await supabase
      .from("admin_push_subscriptions")
      .select("endpoint, p256dh, auth_key");

    if (subError) throw subError;
    console.log(`Admins inscritos: ${subs?.length ?? 0}`);

    const pushPayload = JSON.stringify({
      notification: {
        title: ADMIN_TITLES[type],
        body: email ? `${email}` : `ID: ${userId ?? "desconhecido"}`,
      },
      data: { url: "/notificacoes", type },
    });

    // 2) Enviar push para cada admin, tolerando falhas individuais.
    const results = await Promise.allSettled(
      (subs ?? []).map(async (s, i) => {
        const pushSubscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } };
        try {
          const res = await webpush.sendNotification(pushSubscription, pushPayload);
          console.log(`Push admin ${i} enviado`);
          return res;
        } catch (e: any) {
          console.error(`Push admin ${i} falhou:`, e.message, e.body ?? "");
          throw e;
        }
      })
    );

    // 3) Registrar no inbox interno do admin.
    try {
      await supabase.rpc("insert_admin_notification", {
        _type: type,
        _payload: { user_id: userId, email, timestamp: new Date().toISOString() },
      });
      console.log("admin_notifications: entrada registrada");
    } catch (e: any) {
      console.error("Erro ao registrar admin_notifications:", e.message);
    }

    console.log("Finalizado. Resultados:", JSON.stringify(results.map((r) => r.status)));
    return new Response(JSON.stringify({ message: "Notificado", type, results }), { status: 200 });
  } catch (error: any) {
    console.error("Erro geral:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

// Se o webhook não enviar um `type` explícito, deduz pelo formato do record:
// novo cadastro vem com record = perfil/usuário (tem email); nova assinatura
// vem com record contendo old_record (transição de status) — fallback 'nova_assinatura'.
function inferEventType(record: any): EventType {
  if (record?.old_record !== undefined) return "nova_assinatura";
  if (record?.email !== undefined) return "novo_cadastro";
  return "novo_cadastro";
}
