import { Component, type ErrorInfo, type ReactNode } from "react";
import { Sentry } from "@/lib/sentry";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);

    // A dynamic import that fails because its chunk was replaced by a
    // newer deploy (or served stale by a Service Worker) surfaces here
    // as a render error. Rather than show the crash screen, hard-reload
    // ONCE to pull the fresh index.html + chunk list. Guarded by
    // sessionStorage so a genuinely broken build can't loop forever.
    const msg = error?.message || "";
    const isChunkError = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk .* failed|ChunkLoadError/i.test(msg);
    if (isChunkError && !sessionStorage.getItem("plotzy-chunk-reload")) {
      sessionStorage.setItem("plotzy-chunk-reload", String(Date.now()));
      window.location.reload();
      return;
    }

    // Ship React render errors to Sentry with the component stack
    // attached as context — without this, the stack we'd see in the
    // dashboard is just the minified bundle and triage is painful.
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack } },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16,
          background: "#221b11", color: "#f7f2e4", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
          padding: 24, textAlign: "center",
        }}>
          <div style={{ fontSize: 48 }}>:/</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "rgba(244,239,226,0.5)", maxWidth: 400, lineHeight: 1.6 }}>
            An unexpected error occurred. Please refresh the page to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px", borderRadius: 10, background: "#f7f2e4", color: "#221b11",
              border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8,
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
