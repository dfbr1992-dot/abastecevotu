import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Substitua pelo seu VAPID public key gerado pelo Firebase
const VAPID_PUBLIC_KEY = "BA57Z49Blal4DE1oz5cgBAFIkhinHfIxFlf2vV0EY0XEpx-1nRQGmEwpZp_1v1OXKMGo4TIFevl169srNrNEM50";

const DEVICE_ID_KEY = "push_device_id";

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

    let subscription = await registration.pushManager.getSubscription();

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
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
      console.log("Push Subscription created:", subscription);
    }

    const deviceId = getOrCreateDeviceId();

    // Quando o usuário já está autenticado, mantém a compatibilidade com o
    // fluxo existente: upsert identificado pelo usuário.
    if (userId) {
      const { error } = await supabase.from("user_subscriptions").upsert(
        {
          user_id: userId,
          fcm_token: JSON.stringify(subscription),
          posto_id: postoId || null,
          combustivel_tipo: combustivelTipo || null,
        },
        { onConflict: "user_id" }
      );

      if (error) {
        console.error("Error saving subscription to Supabase:", error);
      } else {
        console.log("Push subscription saved to Supabase");
      }
      return;
    }

    // Fluxo anônimo: registra com user_id NULL + device_id (on conflict por
    // device_id, nunca duplica a inscrição do mesmo dispositivo).
    const { error } = await supabase.from("user_subscriptions").upsert(
      {
        user_id: null,
        device_id: deviceId,
        fcm_token: JSON.stringify(subscription),
      },
      { onConflict: "device_id" }
    );

    if (error) {
      console.error("Error saving anonymous subscription to Supabase:", error);
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
    console.log("Push Subscription unsubscribed");

    // Remove a inscrição do backend pelo device_id (anônimo) ou user_id (logado).
    const match = userId ? { user_id: userId } : { device_id: getOrCreateDeviceId() };
    const { error } = await supabase.from("user_subscriptions").delete().match(match);

    if (error) {
      console.error("Error removing subscription from Supabase:", error);
    } else {
      console.log("Push subscription removed from Supabase");
    }
  }
}
