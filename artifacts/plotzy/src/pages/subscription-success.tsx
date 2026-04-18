import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, ArrowRight, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function SubscriptionSuccess() {
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      setVerifying(false);
      setSuccess(false);
      return;
    }

    fetch(`/api/subscription/verify?session_id=${sessionId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setSuccess(true);
          setPlan(data.plan);
          queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
      })
      .catch(console.error)
      .finally(() => setVerifying(false));
  }, [queryClient]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-white px-4"
      style={{
        backgroundColor: "#0a0a08",
        backgroundImage: `radial-gradient(ellipse 60% 40% at 50% 30%, rgba(255,255,255,0.04) 0%, transparent 70%)`,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10 opacity-50">
        <BookOpen className="w-5 h-5" style={{ color: "#EFEFEF" }} />
        <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#EFEFEF" }}>
          Plotzy
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-6 sm:p-10 max-w-md w-full text-center"
        style={{
          backgroundColor: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 0 60px rgba(255,255,255,0.03)",
        }}
      >
        {verifying ? (
          <div className="flex flex-col items-center gap-5">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#EFEFEF" }} />
            <p className="text-zinc-400">Confirming your subscription…</p>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.1 }}
            >
              <CheckCircle className="w-16 h-16" style={{ color: "#EFEFEF" }} />
            </motion.div>

            <div className="mt-2">
              <h1 className="text-2xl font-bold text-white mb-2">You're all set!</h1>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Your{" "}
                <span className="font-medium" style={{ color: "#EFEFEF" }}>
                  {plan === "yearly" ? "yearly" : "monthly"}
                </span>{" "}
                Plotzy Pro subscription is now active. Enjoy unlimited writing!
              </p>
            </div>

            <Link
              href="/"
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-opacity hover:opacity-90"
              style={{ background: "#EFEFEF", color: "#111111" }}
            >
              Start writing
              <ArrowRight className="w-4 h-4" />
            </Link>

            <p className="text-zinc-700 text-xs mt-1">
              A confirmation has been sent to your email.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-zinc-300">Something went wrong verifying your subscription.</p>
            <p className="text-zinc-500 text-sm leading-relaxed">
              If you completed payment, your subscription will activate shortly. Contact support if this persists.
            </p>
            <Link href="/" className="mt-2 text-sm hover:opacity-80 transition-opacity" style={{ color: "#EFEFEF" }}>
              Back to home
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
