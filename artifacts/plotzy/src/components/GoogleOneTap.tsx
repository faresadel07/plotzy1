import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

/**
 * Google One Tap sign-in prompt.
 *
 * Shows the non-intrusive top-right Google prompt to visitors who are not
 * signed in but have a Google session in the browser. On success, sends the
 * ID token to the backend where it is verified against Google's JWKS and a
 * server-side session is created — only then do we refetch the auth state.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: "signin" | "signup" | "use";
            itp_support?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: (listener?: (notification: OneTapNotification) => void) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface OneTapNotification {
  isDisplayMoment?: () => boolean;
  isDisplayed?: () => boolean;
  isNotDisplayed?: () => boolean;
  getNotDisplayedReason?: () => string;
  isSkippedMoment?: () => boolean;
  getSkippedReason?: () => string;
  isDismissedMoment?: () => boolean;
  getDismissedReason?: () => string;
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const DISMISSED_KEY = "plotzy-one-tap-dismissed-until";
// Cool-off period after the user explicitly dismisses the prompt — avoids
// nagging them every page visit.
const DISMISS_COOLOFF_MS = 24 * 60 * 60 * 1000; // 24h

function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("GSI load failed")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("GSI load failed"));
    document.head.appendChild(s);
  });
}

export default function GoogleOneTap() {
  const { user, isLoading, refetch } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const promptedRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (user) return;                  // Don't prompt signed-in users
    if (promptedRef.current) return;   // Prompt once per mount
    try {
      const until = Number(localStorage.getItem(DISMISSED_KEY) || 0);
      if (until && Date.now() < until) return;
    } catch {}

    let cancelled = false;

    (async () => {
      try {
        const cfgRes = await fetch("/api/auth/google/config", { credentials: "include" });
        if (!cfgRes.ok) return;
        const cfg = (await cfgRes.json()) as { clientId: string | null; enabled: boolean };
        if (!cfg.enabled || !cfg.clientId) return;

        await loadGsiScript();
        if (cancelled || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: cfg.clientId,
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signin",
          itp_support: true,
          use_fedcm_for_prompt: true, // Required by Chrome's 2024+ FedCM migration
          callback: async (response) => {
            if (!response?.credential) return;
            try {
              const res = await fetch("/api/auth/google/one-tap", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential: response.credential }),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                toast({
                  title: "Sign-in failed",
                  description: data?.message || "Please try again.",
                  variant: "destructive",
                });
                return;
              }
              await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              await refetch();
              toast({ title: "Welcome back!", description: "You're signed in." });
            } catch {
              toast({
                title: "Sign-in failed",
                description: "Network error. Please try again.",
                variant: "destructive",
              });
            }
          },
        });

        window.google.accounts.id.prompt((notification) => {
          try {
            if (notification?.isDismissedMoment?.()) {
              localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_COOLOFF_MS));
            }
          } catch {}
        });
        promptedRef.current = true;
      } catch (err) {
        log("init threw", err);
      }
    })();

    return () => {
      cancelled = true;
      try {
        window.google?.accounts?.id?.cancel();
      } catch {}
    };
  }, [user, isLoading, queryClient, refetch, toast]);

  return null;
}
