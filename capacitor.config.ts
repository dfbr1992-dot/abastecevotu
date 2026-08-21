import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.abastecevotu.app',
  appName: 'Abastece Votu',
  webDir: 'dist/client'
  // TODO push notifications: the app currently sends Web Push via VAPID
  // (see src/lib/push-service.ts and the send-notification/send-price-notification
  // Supabase edge functions). That doesn't work inside the native shell —
  // iOS/Android need @capacitor/push-notifications wired to FCM (APNs via FCM
  // on iOS). Migrating VAPID -> FCM and adding the PushNotifications plugin
  // config here is deliberately out of scope for this pass; tracked as a
  // separate prompt.
};

export default config;
