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

type Audience = "todos" | "sem_conta" | "com_conta" | "assinante";

function getSegmentFilter(audience: Audience) {
  switch (audience) {
    case "sem_conta":
      return { user_id: { is: null }, segmento: "sem_conta" };
    case "com_conta":
      return { segmento: "com_conta" };
    case "assinante":
      return { segmento: "assinante" };
    default:
      return {};
  }
}

serve(async (req) => {
  console.log("Função iniciada");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const payload = await req.json();
    console.log("Payload recebido:", JSON.stringify(payload));

    // Compatibilidade com o webhook existente: { record: { titulo, mensagem } }
    // e com chamada direta do admin: { titulo, mensagem, audience? }
    const notif = payload.record ?? payload;
    const titulo = notif.titulo;
    const mensagem = notif.mensagem;
    const audience: Audience = (payload.audience as Audience) ?? "todos";

    // 1) Determinar os destinos conforme a audiência selecionada.
    //    A view push_audience_segments classifica cada subscription; o filtro
    //    audience 'todos' mantém o comportamento antigo (broadcast completo).
    const { data: segments, error: segError } = await supabase
      .from("push_audience_segments")
      .select("subscription_id, user_id, segmento")
      .match(getSegmentFilter(audience));

    if (segError) throw segError;

    const subscriptionIds = (segments ?? []).map((s) => s.subscription_id);
    console.log(
      `Audiência '${audience}': ${subscriptionIds.length} inscrições selecionadas`
    );

    const { data: subscriptions, error } = await supabase
      .from("user_subscriptions")
      .select("id, fcm_token")
      .in("id", subscriptionIds.length ? subscriptionIds : ["00000000-0000-0000-0000-000000000000"]);

    if (error) throw error;

    if (!subscriptions?.length) {
      return new Response(
        JSON.stringify({ message: `Nenhum inscrito no segmento '${audience}'` }),
        { status: 200 }
      );
    }

    // 2) Enviar push para cada inscrição do segmento.
    const results = await Promise.allSettled(
      subscriptions.map(async (sub, i) => {
        console.log(`Enviando push ${i}...`);
        const pushSubscription = JSON.parse(sub.fcm_token);
        try {
          const res = await webpush.sendNotification(
            pushSubscription,
            JSON.stringify({
              notification: { title: titulo, body: mensagem },
              data: { url: "/" },
            })
          );
          console.log(`Push ${i} enviado com sucesso`);
          return res;
        } catch (e: any) {
          console.error(`Push ${i} falhou:`, e.message, e.body ?? "");
          throw e;
        }
      })
    );

    console.log("Finalizado. Resultados:", JSON.stringify(results.map((r) => r.status)));
    return new Response(
      JSON.stringify({ message: "Enviado", audience, results }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro geral:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
