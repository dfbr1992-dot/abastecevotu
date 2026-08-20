import { supabase } from "@/integrations/supabase/client";
// Substitua pelo seu VAPID public key gerado pelo Firebase
const VAPID_PUBLIC_KEY = "BHm0aMLhlzuzxEJXTUb15j62z7LAI0tjowLKFT3jDHznvGozW3LjJJprYFo6s1FmLHX2s9MAR0v7i0dRTAQcJJ4";
const DEVICE_ID_KEY = "push_device_id";
// Token placeholder usado quando a Push API não está disponível (ex.:
// ambiente desktop sem serviço de push). O índice composto e a coluna
// fcm_token NOT NULL exigem um valor não vazio para não duplicar linhas.
const ANON_TOKEN_PREFIX = "anon:";
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
// Identificador persistente do dispositivo, gerado uma vez e salvo em
// localStorage. Usado para registrar a inscrição push anônima (pré-login)
// e para adotá-la quando o usuário autenticar.
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}
// Serializa a inscrição push para armazenamento; quando não há Push API
// disponível, retorna um token derivado do deviceId para manter a linha
// única por dispositivo sem violar a constraint NOT NULL de fcm_token.
function serializeSubscription(
  subscription: PushSubscription | null,
  deviceId: string
): string {
  if (!subscription) return `${ANON_TOKEN_PREFIX}${deviceId}`;
  try {
    return JSON.stringify(subscription.toJSON());
  } catch {
    return `${ANON_TOKEN_PREFIX}${deviceId}`;
  }
}
function isAnonToken(token: string): boolean {
  return token.startsWith(ANON_TOKEN_PREFIX);
}
// Registra a inscrição push ANTES da autenticação (anônima): user_id NULL +
// device_id. Ao fazer login, a inscrição é adotada pelo usuário (ver
// adoptPushSubscriptionOnLogin). Preserva o fluxo de watch de posto/combustível
// opcional passado como params extras.
export async function registerPushNotifications(
  userId?: string,
  postoId?: string,
  combustivelTipo?: string
) {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported");
    return;
  }
  if (!("PushManager" in window)) {
    console.warn("Push API not supported");
    return;
  }
  const permission = Notification.permission;
  if (permission === "denied") {
    console.warn("Push permission denied");
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js");
    console.log("Service Worker registered with scope:", registration.scope);
    let subscription: PushSubscription | null = await registration.pushManager.getSubscription();
    if (!subscription) {
      // Solicita a permissão de notificação na primeira carga do PWA,
      // antes de qualquer autenticação.
      if (permission !== "granted") {
        const result = await Notification.requestPermission();
        if (result !== "granted") {
          console.warn("Push permission not granted:", result);
          return;
        }
      }
      try {
        const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
        console.log("Push Subscription created:", subscription);
      } catch (err) {
        // Ambientes sem Push API funcional (ex.: navegadores desktop sem
        // backend de push) não conseguem criar a assinatura — o registro
        // é feito com token derivado do deviceId apenas para marcar o
        // dispositivo e permitir a adoção pós-login.
        console.warn("Push subscription not available, using device token:", err);
      }
    }
    const deviceId = getOrCreateDeviceId();
    const token = serializeSubscription(subscription, deviceId);
    if (userId) {
      // Fluxo logado: usa a RPC register_user_push_subscription (SECURITY
      // DEFINER), que contorna a política RLS (auth.uid() = user_id) que
      // fazia o upsert direto do cliente falhar com erro 42703. O upsert é
      // feito pelo índice único composto user_subscriptions_user_sub_key
      // (user_id, fcm_token, posto_id, combustivel_tipo).
      const { error } = await supabase.rpc("register_user_push_subscription", {
        _fcm_token: token,
        _posto_id: postoId || undefined,
        _combustivel_tipo: combustivelTipo || undefined,
        _device_id: deviceId,
      });
      if (error) {
        console.error("Error saving subscription to Supabase:", error);
      } else {
        console.log("Push subscription saved to Supabase");
      }
      return;
    }
    // Fluxo anônimo: registra com user_id NULL + device_id. O índice único
    // de device_id é parcial (WHERE user_id IS NULL) e o Postgres não
    // permite usá-lo no ON CONFLICT; além disso fcm_token é NOT NULL, então
    // o token placeholder derivado do deviceId garante a unicidade por
    // dispositivo sem gerar linhas duplicadas.
    const { data: existing, error: findError } = await supabase
      .from("user_subscriptions")
      .select("id")
      .is("user_id", null)
      .eq("device_id", deviceId)
      .maybeSingle();
    let upsertError: { message: string } | null = null;
    if (findError) {
      upsertError = findError;
    } else if (existing) {
      const { error } = await supabase
        .from("user_subscriptions")
        .update({ fcm_token: token })
        .eq("id", existing.id);
      if (error) upsertError = error;
    } else {
      const { error } = await supabase.from("user_subscriptions").insert({
        user_id: null,
        device_id: deviceId,
        fcm_token: token,
      });
      if (error) upsertError = error;
    }
    if (upsertError) {
      console.error("Error saving anonymous subscription to Supabase:", upsertError);
    } else {
      console.log("Anonymous push subscription saved to Supabase");
    }
  } catch (error) {
    console.error("Error registering push notifications:", error);
  }
}
// Adota a inscrição push anônima após o login: chama a RPC adopt_push_subscription
// passando o device_id salvo em localStorage, que vincula a linha existente ao
// usuário autenticado (UPDATE, sem duplicar linhas).
export async function adoptPushSubscriptionOnLogin() {
  const deviceId = getOrCreateDeviceId();
  if (!deviceId) return;
  const { error } = await supabase.rpc("adopt_push_subscription", { _device_id: deviceId });
  if (error) {
    console.error("Error adopting anonymous push subscription:", error);
  } else {
    console.log("Anonymous push subscription adopted");
  }
}
export async function unregisterPushNotifications(userId?: string) {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }
  const deviceId = getOrCreateDeviceId();
  if (userId) {
    const { error } = await supabase
      .from("user_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("fcm_token", serializeSubscription(subscription, deviceId));
    if (error) {
      console.error("Error unregistering push subscription:", error);
    }
  } else if (deviceId) {
    const { error } = await supabase
      .from("user_subscriptions")
      .delete()
      .is("user_id", null)
      .eq("device_id", deviceId);
    if (error) {
      console.error("Error unregistering anonymous push subscription:", error);
    }
  }
}
