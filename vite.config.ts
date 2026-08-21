import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// The Cloudflare Worker build (`npm run build`) stays SSR — that's the
// primary web deploy and must not change. SPA mode is only turned on for
// the Capacitor build (`npm run build:capacitor`): TanStack Start's SPA
// prerender step needs to boot the just-built SSR server directly, which
// conflicts with how @cloudflare/vite-plugin restructures that output
// for Wrangler (it renames the entry to index.js), so the Cloudflare
// plugin is disabled for that build too.
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1";

export default defineConfig({
  cloudflare: isCapacitorBuild ? false : undefined,
  tanstackStart: isCapacitorBuild
    ? {
        // Emit the shell as index.html (TanStack's default is _shell.html,
        // meant for host-level SPA-fallback rewrites) so Capacitor's
        // WebView finds a real entry point in webDir.
        spa: { enabled: true, prerender: { outputPath: "/index" } },
      }
    : undefined,
});