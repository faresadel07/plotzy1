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
        name: "Plotzy — Write Your Story",
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
    // with a heavy 3D renderer (three.js + drei = ~880 kB minified).
    // Our remaining chunks above 500 kB (vendor-three) are loaded
    // strictly via dynamic import on user action, not on first paint.
    chunkSizeWarningLimit: 1000,
    // Filter the eager <link rel="modulepreload"> hints in index.html.
    // Vite's default is to preload every chunk in the entry's transitive
    // graph, but our heavy vendor chunks (three.js, recharts, mammoth,
    // html2canvas, dnd, tiptap) are only reached via dynamic imports
    // from specific lazy routes. Preloading them on the landing page
    // forces every visitor to download megabytes of JS they may never
    // need. The runtime __vitePreload call still preloads them at the
    // moment the lazy chunk is requested, so navigation latency is
    // unaffected — only initial paint gets faster.
    modulePreload: {
      resolveDependencies(_filename, deps) {
        const lazyVendors = [
          "vendor-three",
          "vendor-charts",
          "vendor-mammoth",
          "vendor-html2canvas",
          "vendor-dnd",
          "vendor-tiptap",
          "vendor-paypal",
          "vendor-dompurify",
        ];
        return deps.filter((d) => !lazyVendors.some((v) => d.includes(v)));
      },
    },
    // Manual vendor chunking. Without this, every node_modules dep
    // ends up in the main `index` bundle (~2 MB before this change),
    // which means a slow first paint AND every page navigation
    // re-downloads React + Radix + Tiptap when only the route code
    // actually changed. Splitting heavy libs into their own chunks
    // lets the browser cache them across navigations and across
    // deploys (filenames are content-hashed; the React chunk hash
    // only changes when React itself updates).
    //
    // Lucide is intentionally NOT grouped — each icon is imported by
    // name and tree-shakes into its own tiny per-icon chunk already
    // (visible as the ~0.3–0.5 kB files in the build output). Bundling
    // them would defeat that per-icon split and force every page to
    // download every icon used anywhere in the app.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // React core. Kept together because react/react-dom/scheduler
          // share an internal module graph and Rollup will warn if you
          // split them apart.
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/") ||
            id.includes("/node_modules/react-helmet-async/")
          ) {
            return "vendor-react";
          }
          if (id.includes("/node_modules/@radix-ui/")) return "vendor-radix";
          if (id.includes("/node_modules/@tiptap/")) return "vendor-tiptap";
          if (id.includes("/node_modules/@paypal/")) return "vendor-paypal";
          // @sentry/* AND @sentry-internal/* (replay, feedback, browser-utils, …)
          // are all part of the same SDK, so they belong in one chunk.
          if (
            id.includes("/node_modules/@sentry/") ||
            id.includes("/node_modules/@sentry-internal/")
          ) {
            return "vendor-sentry";
          }
          if (id.includes("/node_modules/@tanstack/")) return "vendor-query";
          if (
            id.includes("/node_modules/three/") ||
            id.includes("/node_modules/@react-three/")
          ) {
            return "vendor-three";
          }
          if (
            id.includes("/node_modules/motion/") ||
            id.includes("/node_modules/framer-motion/") ||
            id.includes("/node_modules/gsap/")
          ) {
            return "vendor-motion";
          }
          if (id.includes("/node_modules/@paper-design/")) return "vendor-shaders";
          if (
            id.includes("/node_modules/i18next/") ||
            id.includes("/node_modules/i18next-browser-languagedetector/")
          ) {
            return "vendor-i18n";
          }
          if (
            id.includes("/node_modules/react-hook-form/") ||
            id.includes("/node_modules/@hookform/") ||
            id.includes("/node_modules/zod/")
          ) {
            return "vendor-forms";
          }
          // Charts: only used by analytics-dashboard + course-cert.
          // Splitting it keeps ~370 kB out of every other route.
          if (id.includes("/node_modules/recharts/") || id.includes("/node_modules/d3-")) {
            return "vendor-charts";
          }
          // .docx import (publish-book route only).
          if (id.includes("/node_modules/mammoth/")) return "vendor-mammoth";
          // Bitmap snapshotting (cover-designer + certificate export).
          if (id.includes("/node_modules/html2canvas/")) return "vendor-html2canvas";
          // Drag-and-drop (outline-board + library reordering).
          if (id.includes("/node_modules/@hello-pangea/")) return "vendor-dnd";
          // Date utilities — used widely but small enough to isolate
          // for cache stability.
          if (id.includes("/node_modules/date-fns/")) return "vendor-date";
          // DOM sanitiser, used wherever HTML is rendered. Stable.
          if (id.includes("/node_modules/dompurify/")) return "vendor-dompurify";
          // Everything else from node_modules (clsx, wouter, nanoid,
          // class-variance-authority, tailwind-merge, embla, vaul,
          // input-otp, react-day-picker, …) collapses into one small
          // vendor-misc chunk so we don't fragment caching forever.
          return "vendor-misc";
        },
      },
    },
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
