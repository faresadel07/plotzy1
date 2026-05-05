import { useEffect } from "react";
import { Link, useRoute, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { ShieldCheck, ExternalLink } from "lucide-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { buildEducationalCredentialSchema } from "@/lib/seo-schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CertificateDisplay } from "@/components/course/CertificateDisplay";
import { useLanguage } from "@/contexts/language-context";

interface PublicCertResponse {
  uuid: string;
  issuedAt: string;
  finalExamScore: number;
  holder: {
    displayName: string | null;
    avatarUrl: string | null;
    profileUrl: string;
  };
  courseTitle: string;
}

export default function CertificateVerifyPage() {
  const { t } = useLanguage();
  const [, params] = useRoute("/certificates/:uuid");
  const search = useSearch();
  const uuid = params?.uuid ?? "";
  const justIssued = new URLSearchParams(search).get("just-issued") === "true";

  const certQ = useQuery<PublicCertResponse>({
    queryKey: ["/api/certificates", uuid],
    enabled: !!uuid,
    staleTime: Infinity,
  });

  // Fire confetti exactly once when the page is reached with
  // ?just-issued=true AND the cert resolved (DP7/G3). After firing,
  // strip the query param so a refresh doesn't celebrate again.
  useEffect(() => {
    if (!justIssued || !certQ.data) return;
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.3 },
      ticks: 200,
    });
    setTimeout(() => {
      confetti({ particleCount: 80, spread: 100, origin: { y: 0.4 } });
    }, 300);
    // Strip the query param without adding a history entry.
    const url = new URL(window.location.href);
    url.searchParams.delete("just-issued");
    window.history.replaceState({}, "", url.pathname + (url.search || ""));
  }, [justIssued, certQ.data]);

  const holderName =
    certQ.data?.holder.displayName?.trim() || t("courseCertAnonymousHolder");

  return (
    <Layout>
      <SEO
        title={
          certQ.data
            ? `${t("courseCertTitle")} — ${holderName}`
            : t("courseCertTitle")
        }
        description={
          certQ.data
            ? `${t("courseCertVerifiedDescription")} ${certQ.data.courseTitle}.`
            : undefined
        }
        noindex
      />
      {certQ.data && (
        <JsonLd
          data={buildEducationalCredentialSchema({
            uuid: certQ.data.uuid,
            holderName,
            issuedAt: certQ.data.issuedAt,
          })}
        />
      )}

      <main className="container mx-auto max-w-3xl px-4 py-10 sm:py-16 space-y-8">
        {certQ.isLoading && <CertSkeleton />}

        {certQ.isError && (
          <Card className="p-8 text-center space-y-3">
            <h1 className="text-xl font-semibold">{t("courseCertNotFoundTitle")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("courseCertNotFoundBody")}
            </p>
            <div className="pt-2">
              <Button asChild variant="outline">
                <Link href="/learn">{t("courseCertNotFoundCta")}</Link>
              </Button>
            </div>
          </Card>
        )}

        {certQ.data && (
          <>
            {/* Verified badge */}
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-secondary text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
                <span className="text-muted-foreground">{t("courseCertVerifiedBadge")}</span>
              </div>
            </div>

            <CertificateDisplay
              holderName={holderName}
              finalExamScore={certQ.data.finalExamScore}
              issuedAt={certQ.data.issuedAt}
              certUuid={certQ.data.uuid}
              courseTitle={certQ.data.courseTitle}
            />

            <Card className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm">
                <div className="text-muted-foreground text-xs uppercase tracking-wide">
                  {t("courseCertHolderProfile")}
                </div>
                <Link href={certQ.data.holder.profileUrl}>
                  <a className="font-medium hover:underline inline-flex items-center gap-1">
                    {holderName}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </Link>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/learn">{t("courseCertExploreCourse")}</Link>
              </Button>
            </Card>
          </>
        )}
      </main>
    </Layout>
  );
}

function CertSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-32 bg-secondary rounded mx-auto" />
      <div className="h-96 bg-secondary rounded-2xl" />
      <div className="h-12 bg-secondary rounded" />
    </div>
  );
}
