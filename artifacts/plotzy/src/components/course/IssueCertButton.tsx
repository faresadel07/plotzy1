import { useState } from "react";
import { useLocation } from "wouter";
import { Award, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EligibilityChecklist, type CertificateMissing } from "./EligibilityChecklist";
import { useLanguage } from "@/contexts/language-context";

/**
 * Self-contained "Issue Certificate" CTA. Three flows:
 *   1. Click → POST /api/course/certificate/issue
 *   2a. Success (201 / 200 with alreadyIssued) → redirect to
 *       /certificates/:uuid?just-issued=true (DP7/G3 — confetti
 *       fires on the verification page).
 *   2b. 409 NOT_ELIGIBLE → open dialog with EligibilityChecklist
 *       showing what's still pending.
 *
 * The component does NOT directly know the user's progress — it asks
 * the server to decide. That keeps the eligibility rules in one place
 * (storage.getCertificateEligibility) instead of duplicating them
 * client-side.
 *
 * Reuses: <Button>, <Dialog>, <EligibilityChecklist>, lucide-react,
 * wouter useLocation, useLanguage().
 * Non-goals: optimistic UI (we wait for the server). The button is
 * disabled while in-flight.
 */

interface IssueCertButtonProps {
  className?: string;
  /** Optional override for navigate() — used by tests. */
  navigateTo?: (path: string) => void;
}

interface IssueResponse {
  uuid: string;
  alreadyIssued: boolean;
}

interface NotEligibleResponse {
  code: "NOT_ELIGIBLE";
  message: string;
  missing: CertificateMissing;
}

export function IssueCertButton({ className = "", navigateTo }: IssueCertButtonProps) {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [pending, setPending] = useState(false);
  const [missing, setMissing] = useState<CertificateMissing | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = navigateTo ?? navigate;

  async function handleIssue() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/course/certificate/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = (await res.json()) as IssueResponse | NotEligibleResponse | { message?: string };

      if (res.status === 409 && "code" in data && data.code === "NOT_ELIGIBLE") {
        setMissing(data.missing);
        return;
      }

      if (res.ok && "uuid" in data) {
        // Redirect with the just-issued query param so /certificates/:uuid
        // fires confetti exactly once. Fresh issuance vs already-issued
        // both arrive at the same destination; the page checks the flag.
        go(`/certificates/${data.uuid}?just-issued=true`);
        return;
      }

      // Fallback — surface a generic error (server message if available).
      setError(("message" in data && data.message) || t("courseIssueCertError"));
    } catch {
      setError(t("courseIssueCertError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button onClick={handleIssue} disabled={pending} className={`gap-2 ${className}`}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Award className="h-4 w-4" aria-hidden />
        )}
        {t("courseIssueCertCta")}
      </Button>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <Dialog open={!!missing} onOpenChange={(open) => !open && setMissing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("courseIssueCertNotEligibleTitle")}</DialogTitle>
            <DialogDescription>
              {t("courseIssueCertNotEligibleBody")}
            </DialogDescription>
          </DialogHeader>
          {missing && <EligibilityChecklist missing={missing} className="mt-2" />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMissing(null)}>
              {t("courseDialogClose")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
