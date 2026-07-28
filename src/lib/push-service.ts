import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Substitua pelo seu VAPID public key gerado pelo Firebase
const VAPID_PUBLIC_KEY = "BA57Z49Blal4DE1oz5cgBAFIkhinHfIxFlf2vV0EY0XEpx-1nRQGmEwpZp_1v1OXKMGo4TIFevl169srNrNEM50";

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

export async function registerPushNotifications(userId: string, postoId?: string, combustivelTipo?: string) {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported");
    return;
  }

  if (!("PushManager" in window)) {
    console.warn("Push API not supported");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js");
    console.log("Service Worker registered with scope:", registration.scope);

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
      console.log("Push Subscription created:", subscription);
    }

    // Send the subscription details to your Supabase backend
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
  } catch (error) {
    console.error("Error registering push notifications:", error);
  }
}

export async function unregisterPushNotifications(userId: string) {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
    console.log("Push Subscription unsubscribed");

    // Remove the subscription from your Supabase backend
    const { error } = await supabase.from("user_subscriptions").delete().match({ user_id: userId });

    if (error) {
      console.error("Error removing subscription from Supabase:", error);
    } else {
      console.log("Push subscription removed from Supabase");
    }
  }
}