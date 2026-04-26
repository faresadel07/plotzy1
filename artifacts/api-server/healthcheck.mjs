// Used by the Docker HEALTHCHECK directive — must be ESM-safe and
// work without any deps. Returns exit 0 on healthy, 1 otherwise.
//
// Override the URL via $HEALTHCHECK_URL when the container topology
// changes (e.g. probing a sidecar). Default matches the in-container
// Express port plus the /healthz endpoint registered in app.ts.
const url = process.env.HEALTHCHECK_URL || "http://localhost:8080/healthz";
try {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  process.exit(res.ok ? 0 : 1);
} catch {
  process.exit(1);
}
