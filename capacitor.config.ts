import type { CapacitorConfig } from '@capacitor/cli';

// On Windows, `cap sync` alone can write ios/App/CapApp-SPM/Package.swift
// with backslash paths for local package dependencies, which is invalid
// Swift syntax and fails to build in Xcode. Use `npm run cap:sync` instead
// of `npx cap sync` directly — it runs the sync and then
// scripts/fix-capacitor-spm-paths.mjs to normalize those paths.
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
