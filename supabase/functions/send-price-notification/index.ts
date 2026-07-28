import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

// FCM Server Key (or Service Account Key for FCM v1 HTTP protocol)
// This should be stored securely as a Supabase Secret or environment variable.
// For example, in Supabase CLI: supabase secrets set FCM_SERVER_KEY='YOUR_FCM_SERVER_KEY'
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");

serve(async (req) => {
  if (!FCM_SERVER_KEY) {
    console.error("FCM_SERVER_KEY is not set.");
    return new Response(JSON.stringify({ error: "FCM Server Key not configured" }), { status: 500 });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  try {
    const payload = await req.json();
    const newPrice = payload.record;
    const oldPrice = payload.old_record;

    // Ensure it's an update and the price has actually changed
    if (!newPrice || !oldPrice || newPrice.valor === oldPrice.valor) {
      return new Response(JSON.stringify({ message: "No relevant price change" }), { status: 200 });
    }

    const { posto_id, combustivel, valor } = newPrice;

    // Find users subscribed to this specific posto and/or fuel type
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("user_subscriptions")
      .select("user_id, fcm_token")
      .or(`posto_id.eq.${posto_id},combustivel_tipo.eq.${combustivel}`);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(JSON.stringify({ error: "Failed to fetch subscriptions" }), { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No subscribers found for this update" }), { status: 200 });
    }

    const fcmTokens = subscriptions.map((sub) => sub.fcm_token);
    const uniqueFcmTokens = [...new Set(fcmTokens)]; // Avoid sending duplicate notifications to the same device

    const notificationTitle = `Preço atualizado no posto!`;
    const notificationBody = `${combustivel.charAt(0).toUpperCase() + combustivel.slice(1)} agora custa R$ ${valor.toFixed(2)} no seu posto favorito.`;

    // Send notifications via FCM
    const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({ 
        registration_ids: uniqueFcmTokens, 
        notification: { 
          title: notificationTitle, 
          body: notificationBody 
        }, 
        data: { 
          posto_id: posto_id, 
          combustivel: combustivel, 
          valor: valor.toString() 
        } 
      }),
    });

    const fcmResult = await fcmResponse.json();
    console.log("FCM Result:", fcmResult);

    return new Response(JSON.stringify({ message: "Notifications sent", fcmResult }), { status: 200 });
  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
