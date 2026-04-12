import { Link } from "wouter";
import { BookOpen } from "lucide-react";

const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", background: "#000", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: SF, color: "#fff", padding: 24, textAlign: "center",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16, marginBottom: 24,
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <BookOpen style={{ width: 28, height: 28, color: "rgba(255,255,255,0.3)" }} />
      </div>
      <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.04em", margin: "0 0 8px" }}>404</h1>
      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", margin: "0 0 32px" }}>
        This page doesn't exist or has been moved.
      </p>
      <Link href="/">
        <span style={{
          padding: "12px 32px", borderRadius: 10, background: "#fff", color: "#000",
          fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-block",
        }}>
          Back to Home
        </span>
      </Link>
    </div>
  );
}
