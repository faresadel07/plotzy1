import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check, Loader2, Lock } from "lucide-react";
import { createCheckoutSession } from "@/hooks/use-subscription";
import { useAuth } from "@/contexts/auth-context";
import { Link, useLocation } from "wouter";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: "chapter_limit" | "word_limit";
}

const FEATURES = [
  "Unlimited books & chapters",
  "Unlimited words and pages",
  "AI writing assistance",
  "Voice input & narration",
  "45+ languages with RTL",
  "PDF & EPUB export",
];

export function UpgradeModal({ open, onClose, reason = "chapter_limit" }: UpgradeModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  async function handleSubscribe() {
    if (!user) {
      onClose();
      navigate("/?auth=required");
      return;
    }
    setLoading(true);
    try {
      const url = await createCheckoutSession(billingCycle);
      if (url) window.location.href = url;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const title = reason === "chapter_limit"
    ? "You've reached the free chapter limit"
    : "You've reached the free word limit";

  const subtitle = reason === "chapter_limit"
    ? "The free trial includes 1 chapter. Upgrade to write unlimited chapters and books."
    : "The free trial allows up to 3,750 words (15 pages). Upgrade to write without limits.";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative rounded-2xl shadow-2xl max-w-md w-full p-8 z-10"
            style={{
              backgroundColor: "#0f0f0f",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.7)",
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-bold text-white text-base leading-tight">{title}</h2>
            </div>

            <p className="text-zinc-500 text-sm mb-6 leading-relaxed">{subtitle}</p>

            {/* Billing toggle */}
            <div
              className="flex rounded-full p-1 mb-6 gap-1"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}
            >
              <button
                onClick={() => setBillingCycle("monthly")}
                className="flex-1 py-2 rounded-full text-xs font-medium transition-all"
                style={
                  billingCycle === "monthly"
                    ? { background: "#EFEFEF", color: "#111111" }
                    : { color: "#6b6b6b" }
                }
              >
                Monthly · $8/mo
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className="flex-1 py-2 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                style={
                  billingCycle === "yearly"
                    ? { background: "#EFEFEF", color: "#111111" }
                    : { color: "#6b6b6b" }
                }
              >
                Yearly · $6.50/mo
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={
                    billingCycle === "yearly"
                      ? { backgroundColor: "rgba(0,0,0,0.18)", color: "#111111" }
                      : { backgroundColor: "rgba(255,255,255,0.08)", color: "#EFEFEF" }
                  }
                >
                  Save 19%
                </span>
              </button>
            </div>

            {/* Features */}
            <ul className="space-y-2 mb-6">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-400">
                  <Check className="w-4 h-4 shrink-0 text-white" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold transition-opacity flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90"
              style={{ background: "#EFEFEF", color: "#111111" }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" fill="currentColor" />
              )}
              {loading ? "Redirecting to checkout…" : `Upgrade — ${billingCycle === "monthly" ? "$8/month" : "$78/year"}`}
            </button>

            <div className="flex items-center justify-between mt-4">
              <p className="text-zinc-700 text-xs">Cancel anytime · Stripe secured</p>
              <Link
                href="/pricing"
                onClick={onClose}
                className="text-xs underline hover:opacity-80 transition-opacity text-zinc-400"
              >
                See full pricing
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
