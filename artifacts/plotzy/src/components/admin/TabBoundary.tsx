// A crash fence around one admin section.
//
// Before this, any render-time throw inside a tab escaped to the app-root
// ErrorBoundary, which replaced the WHOLE site with the crash screen — the
// admin lost the panel, the route, and their place. Now a broken section
// shows an inline card with the error and a retry button, and every other
// section keeps working.

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  /** Changing this resets the boundary — we pass the active tab id. */
  resetKey: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class TabBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the detail in the console for debugging; the UI stays calm.
    console.error("[admin] section crashed:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          background: "#fffdf7",
          border: "1px solid rgba(161,60,44,0.28)",
          borderRadius: 14,
          padding: "22px 24px",
          maxWidth: 560,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: "#2f2618", marginBottom: 6 }}>
          This section could not be displayed
        </div>
        <div style={{ fontSize: 13, color: "#6d6354", lineHeight: 1.6, marginBottom: 14 }}>
          The rest of the panel is unaffected. Try again, or switch to another section.
        </div>
        <div
          style={{
            fontSize: 11.5,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            color: "#a13c2c",
            background: "rgba(161,60,44,0.07)",
            border: "1px solid rgba(161,60,44,0.18)",
            borderRadius: 8,
            padding: "8px 10px",
            marginBottom: 14,
            wordBreak: "break-word",
          }}
        >
          {error.message || String(error)}
        </div>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            background: "#292115",
            color: "#f4efe2",
            border: "none",
            borderRadius: 9,
            padding: "9px 18px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
