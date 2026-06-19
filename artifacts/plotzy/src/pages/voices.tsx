// Voices listing page.
//
// Editorial entry point at /voices. Hero, filter chips by language,
// sort dropdown, then a card grid of every loaded profile.
//
// Empty state: when Phase B has not landed yet (VOICES array is
// empty), the page shows a friendly "coming soon" block rather than
// a broken empty grid.

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/language-context";
import {
  VOICES,
  getCoveredLanguages,
  type VoiceLanguage,
  type VoiceProfile,
} from "@/data/voices";

const SF =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

type SortKey = "alpha" | "birth-asc" | "newest";

const LANGUAGE_LABELS: Record<VoiceLanguage, { en: string; ar: string }> = {
  ar: { en: "Arabic", ar: "العربيّة" },
  en: { en: "English", ar: "الإنجليزيّة" },
  es: { en: "Spanish", ar: "الإسبانيّة" },
  ru: { en: "Russian", ar: "الروسيّة" },
  fr: { en: "French", ar: "الفرنسيّة" },
  de: { en: "German", ar: "الألمانيّة" },
  ja: { en: "Japanese", ar: "اليابانيّة" },
  cs: { en: "Czech", ar: "التشيكيّة" },
  pt: { en: "Portuguese", ar: "البرتغاليّة" },
  it: { en: "Italian", ar: "الإيطاليّة" },
  tr: { en: "Turkish", ar: "التركيّة" },
};

export default function VoicesPage() {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";

  const [activeLang, setActiveLang] = useState<"all" | VoiceLanguage>("all");
  const [sort, setSort] = useState<SortKey>("alpha");

  const covered = useMemo(() => getCoveredLanguages(), []);

  const filtered = useMemo(() => {
    let list: VoiceProfile[] = VOICES;
    if (activeLang !== "all") {
      list = list.filter((v) => v.language === activeLang);
    }
    const copy = [...list];
    if (sort === "alpha") {
      copy.sort((a, b) =>
        (ar ? a.name.ar : a.name.en).localeCompare(
          ar ? b.name.ar : b.name.en,
        ),
      );
    } else if (sort === "birth-asc") {
      copy.sort((a, b) => a.bornYear - b.bornYear);
    } else {
      // newest = order of declaration in voices.ts, which mirrors when
      // we added each profile. Reverse so the most recently added
      // appears first.
      return [...list].reverse();
    }
    return copy;
  }, [activeLang, sort, ar]);

  return (
    <Layout>
      <SEO
        title={ar ? "أصوات | بلوتزي" : "Voices | Plotzy"}
        description={
          ar
            ? "بروفايلات لأشهر كتّاب العالم، كتبناها بأنفسنا، مع صور وفيديوهات."
            : "Hand-written profiles of the world's most influential writers, with portraits and video."
        }
      />
      <div
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          fontFamily: SF,
          background: "var(--background, #000)",
          color: "#fff",
          minHeight: "100vh",
        }}
      >
        {/* Hero */}
        <section
          style={{
            padding: "72px 24px 36px",
            maxWidth: 900,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
              fontWeight: 600,
              marginBottom: 18,
            }}
          >
            {ar ? "أصوات" : "Voices"}
          </div>
          <h1
            style={{
              fontSize: "clamp(34px, 5.2vw, 54px)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.08,
              margin: 0,
              marginBottom: 16,
            }}
          >
            {ar
              ? "حيوات الكتّاب الذين شكّلوا العالم."
              : "The lives of writers who shaped the world."}
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.62)",
              margin: 0,
              maxWidth: 620,
              marginInline: "auto",
            }}
          >
            {ar
              ? "بروفايلات قصيرة كتبناها بأنفسنا، بالعربيّة والإنجليزيّة، مرفقة بصور من الملك العامّ ومقتطفات فيديو موثّقة."
              : "Short editorial profiles, hand-written in Arabic and English, paired with public-domain portraits and verified video clips."}
          </p>
        </section>

        {/* Filter + sort row */}
        {VOICES.length > 0 && (
          <section
            style={{
              padding: "16px 24px 8px",
              maxWidth: 1100,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <FilterChip
                active={activeLang === "all"}
                onClick={() => setActiveLang("all")}
                label={ar ? "الكل" : "All"}
              />
              {covered.map((lc) => (
                <FilterChip
                  key={lc}
                  active={activeLang === lc}
                  onClick={() => setActiveLang(lc)}
                  label={ar ? LANGUAGE_LABELS[lc].ar : LANGUAGE_LABELS[lc].en}
                />
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label={ar ? "الترتيب" : "Sort"}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 999,
                padding: "6px 14px",
                color: "#fff",
                fontFamily: SF,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <option value="alpha" style={{ background: "#0a0a0a" }}>
                {ar ? "أبجدياً" : "A to Z"}
              </option>
              <option value="birth-asc" style={{ background: "#0a0a0a" }}>
                {ar ? "حسب الميلاد" : "By birth"}
              </option>
              <option value="newest" style={{ background: "#0a0a0a" }}>
                {ar ? "الأحدث إضافة" : "Newest"}
              </option>
            </select>
          </section>
        )}

        {/* Card grid or empty state */}
        <section
          style={{
            padding: "20px 24px 60px",
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          {VOICES.length === 0 ? (
            <ComingSoonBlock ar={ar} />
          ) : filtered.length === 0 ? (
            <EmptyFilterBlock ar={ar} />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 18,
              }}
            >
              {filtered.map((v) => (
                <VoiceCard key={v.slug} voice={v} ar={ar} />
              ))}
            </div>
          )}
        </section>

        {/* Credits footer link */}
        {VOICES.length > 0 && (
          <section
            style={{
              padding: "12px 24px 48px",
              maxWidth: 1100,
              margin: "0 auto",
              textAlign: "center",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Link
              href="/voices/credits"
              style={{
                display: "inline-block",
                fontSize: 12.5,
                color: "rgba(255,255,255,0.55)",
                marginTop: 16,
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              {ar
                ? "المصادر وحقوق المشاركة →"
                : "Sources and credits →"}
            </Link>
          </section>
        )}
      </div>
    </Layout>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        background: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 999,
        color: active ? "#fff" : "rgba(255,255,255,0.72)",
        fontFamily: SF,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 140ms ease, border-color 140ms ease",
      }}
    >
      {label}
    </button>
  );
}

function VoiceCard({ voice, ar }: { voice: VoiceProfile; ar: boolean }) {
  return (
    <Link href={`/voices/${voice.slug}`}>
      <article
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16,
          overflow: "hidden",
          cursor: "pointer",
          transition: "transform 180ms ease, border-color 180ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        }}
      >
        <div
          style={{
            aspectRatio: "3 / 4",
            background:
              "linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <img
            src={voice.photo.src}
            alt={ar ? voice.photo.alt.ar : voice.photo.alt.en}
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
        <div style={{ padding: "14px 16px 16px" }}>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              margin: 0,
              marginBottom: 4,
              color: "#fff",
            }}
          >
            {ar ? voice.name.ar : voice.name.en}
          </h3>
          <div
            style={{
              fontSize: 11.5,
              color: "rgba(255,255,255,0.45)",
              marginBottom: 8,
            }}
          >
            {voice.bornYear}
            {voice.diedYear ? (ar ? `–${voice.diedYear}` : ` to ${voice.diedYear}`) : ""}
            {"  ·  "}
            {ar ? voice.nationality.ar : voice.nationality.en}
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.72)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {ar ? voice.tagline.ar : voice.tagline.en}
          </div>
        </div>
      </article>
    </Link>
  );
}

function ComingSoonBlock({ ar }: { ar: boolean }) {
  return (
    <div
      style={{
        margin: "20px auto",
        maxWidth: 540,
        padding: "44px 32px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 18,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: "#fff",
          marginBottom: 10,
        }}
      >
        {ar ? "الأصوات الأولى تُكتب الآن." : "The first voices are being written."}
      </div>
      <div
        style={{
          fontSize: 13.5,
          lineHeight: 1.7,
          color: "rgba(255,255,255,0.62)",
        }}
      >
        {ar
          ? "نُحضّر بروفايلات لخمسة وعشرين كاتباً عربياً وأجنبياً، تُنشر على دفعات قريباً."
          : "Twenty-five profiles of Arabic and international writers are on the way, shipping in batches."}
      </div>
    </div>
  );
}

function EmptyFilterBlock({ ar }: { ar: boolean }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "60px 0",
        color: "rgba(255,255,255,0.4)",
        fontSize: 14,
      }}
    >
      {ar ? "لا توجد أصوات بهذا الفلتر." : "No voices match this filter."}
    </div>
  );
}
