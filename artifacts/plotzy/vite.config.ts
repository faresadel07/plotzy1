import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

const rawPort = process.env.PORT || "5173";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  // @huggingface/transformers dynamically imports @onnx/onnxruntime-web
  // and its WASM shards at runtime. Vite's default pre-bundling in
  // dev breaks those dynamic imports because esbuild inlines the ONNX
  // wrapper into a chunk that no longer resolves the WASM URLs. Also
  // needed in prod so Rollup preserves the lazy-import boundary.
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  worker: {
    format: "es",
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Disable the service worker in development. A registered SW in
      // dev intercepts requests, caches JS/HTML/API responses, and
      // makes config/env changes appear to have no effect until the
      // SW updates — which happens on its own schedule. Keeping the
      // PWA on only in production is the standard escape hatch.
      devOptions: { enabled: false },
      includeAssets: ["favicon.png"],
      manifest: {
        name: "Plotzy",
        short_name: "Plotzy",
        description: "A full-featured book writing platform with AI-assisted tools",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/favicon.png", sizes: "192x192", type: "image/png" },
          { src: "/favicon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        // Cache the app shell (JS, CSS, HTML) for offline access
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

        // The SPA's NavigationRoute serves the cached index.html for any
        // top-level navigation that workbox does not have a more specific
        // rule for. Without an explicit denylist, that included routes
        // owned by the API server (/auth/google, /auth/google/callback,
        // /auth/apple/*, /auth/linkedin/*, all of /api/*). On iPad's
        // Safari the SW raced ahead of the network and served the
        // SPA shell for the OAuth callback URL; the SPA had no matching
        // wouter route for /auth/google/callback so it rendered the
        // NotFound page even though the actual sign-in had succeeded
        // (the Google One Tap toast still appeared because that flow
        // talks to /api/auth/google/one-tap from the SPA via fetch,
        // which is XHR and not a navigation, so the SW left it alone).
        //
        // navigateFallbackDenylist tells workbox: do NOT serve
        // index.html for these paths, fall through to the network. The
        // OAuth redirect then reaches Vercel, Vercel rewrites to
        // Railway, Railway sets the session cookie and bounces the
        // browser to /?auth=success, and the SPA's home route renders
        // cleanly with the toast.
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/auth\//,
          /^\/sitemap/,
          /^\/robots\.txt/,
          /^\/\.well-known\//,
        ],
        runtimeCaching: [
          {
            // Cache Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Cache Google Fonts webfonts
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Never go through the service worker for download endpoints.
            // The previous NetworkFirst rule was caching the SPA's 404
            // HTML for /api/books/:id/download (because Vercel was
            // returning that page during a transient routing miss), and
            // every subsequent click on Download → PDF then served the
            // cached HTML instead of the real PDF, leaving the browser
            // showing the 404 screen at the API URL.
            urlPattern: /\/api\/.*\/download/,
            handler: "NetworkOnly",
          },
          {
            // Cache API reads with network-first strategy so offline
            // falls back to last-seen data
            urlPattern: /^\/api\/(books|chapters|lore|auth\/user)/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-data",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // The default 500 kB warning is overly conservative for an SPA
    // with a heavy 3D renderer (three.js + drei) and a rich-text
    // editor (tiptap). Those are dynamically imported anyway.
    chunkSizeWarningLimit: 1500,
    // NOTE on chunking: an earlier iteration (M-4) split node_modules
    // into ~15 named vendor-* chunks via rollupOptions.output.manualChunks.
    // That tripled cache-hit rates in theory, but in production it
    // produced "Cannot access X before initialization" / "Cannot read
    // properties of undefined" runtime errors caused by chunk-load
    // order issues (vendor-three importing react before vendor-react
    // was ready, vendor-charts hitting circular d3 dep init order,
    // etc.). Letting Vite's automatic chunker do the work avoids
    // the entire class of problem. Cold-cache size goes up a bit;
    // correctness wins. If we need to revisit, do it deliberately
    // and re-test on a real Vercel deploy, not just a local build.
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.env", "**/.env.*", "**/.git/**"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      // Trailing slash matters: `/auth` (no slash) was matching `/authors/1`
      // too, forwarding SPA routes to Express which 404'd them. `/auth/`
      // matches only the OAuth callback paths (/auth/google, /auth/apple,
      // /auth/linkedin, /auth/*/callback) and leaves /authors/* alone.
      "/auth/": {
        target: "http://localhost:8080",
        changeOrigin: true,
        followRedirects: false,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
