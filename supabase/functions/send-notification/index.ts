import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails(
  "mailto:seu-email@dominio.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req) => {
  console.log("Função iniciada");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const payload = await req.json();
    console.log("Payload recebido:", JSON.stringify(payload.record));
    const notif = payload.record;

    const { data: subscriptions, error } = await supabase
      .from("user_subscriptions")
      .select("fcm_token");

    console.log("Subscriptions encontradas:", subscriptions?.length ?? 0);
    if (error) throw error;

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ message: "Nenhum inscrito" }), { status: 200 });
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (sub, i) => {
        console.log(`Enviando push ${i}...`);
        const pushSubscription = JSON.parse(sub.fcm_token);
        try {
          const res = await webpush.sendNotification(
            pushSubscription,
            JSON.stringify({
              notification: { title: notif.titulo, body: notif.mensagem },
              data: { url: "/" },
            })
          );
          console.log(`Push ${i} enviado com sucesso`);
          return res;
        } catch (e) {
          console.error(`Push ${i} falhou:`, e.message, e.body ?? "");
          throw e;
        }
      })
    );

    console.log("Finalizado. Resultados:", JSON.stringify(results.map(r => r.status)));
    return new Response(JSON.stringify({ message: "Enviado", results }), { status: 200 });
  } catch (error) {
    console.error("Erro geral:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});