// Self-Publishing Path
//
// The third top-level tab in the Find Publishers page, sitting next
// to "Publisher Directory" and "Publishing Guide". Lets writers who
// don't want to chase agents / publishers take the indie route
// instead, with the same level of editorial care.
//
// Three sections:
//   - Why go indie? — fair, two-sided comparison vs traditional
//   - Platforms — KDP, IngramSpark, Apple Books, Kobo, ACX, Findaway
//     Voices, Draft2Digital. Each with what it does well, what it
//     costs, what royalty rate it pays.
//   - Royalty calculator — punch in price + expected sales + format
//     and see take-home across the major platforms side by side.

import { useMemo, useState } from "react";
import { ExternalLink, CheckCircle2, XCircle, Calculator, Info } from "lucide-react";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';
const CARD = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.09)";
const TEXT = "#f0efe8";
const MUTED = "rgba(255,255,255,0.55)";
const MUTED2 = "rgba(255,255,255,0.35)";

// ── Indie comparison ──────────────────────────────────────────────

const COMPARISON: Array<{ topic: string; topicAr: string; indie: string; indieAr: string; trad: string; tradAr: string }> = [
  {
    topic: "Royalty rate",
    topicAr: "نسبة الإتاوة",
    indie: "35–70% of cover price (KDP)",
    indieAr: "35–70% من سعر الغلاف (KDP)",
    trad: "10–15% of cover price",
    tradAr: "10–15% من سعر الغلاف",
  },
  {
    topic: "Time to publish",
    topicAr: "وقت النشر",
    indie: "Days. Push live whenever you want.",
    indieAr: "أيام. تنشر متى ما أردت.",
    trad: "12–24 months after signing.",
    tradAr: "12–24 شهراً بعد التوقيع.",
  },
  {
    topic: "Editorial support",
    topicAr: "الدعم التحريري",
    indie: "You hire freelancers. You decide.",
    indieAr: "تستأجر مستقلّين. أنت تقرّر.",
    trad: "In-house editors. Pro guidance.",
    tradAr: "محرّرون داخليّون. توجيه احترافي.",
  },
  {
    topic: "Marketing",
    topicAr: "التسويق",
    indie: "On you. Ads, social, mailing list.",
    indieAr: "عليك. إعلانات، سوشيال، قائمة بريديّة.",
    trad: "Publisher does most of it (varies).",
    tradAr: "الناشر يقوم بمعظمها (يتفاوت).",
  },
  {
    topic: "Bookstore distribution",
    topicAr: "التوزيع في المكتبات",
    indie: "Limited. IngramSpark helps.",
    indieAr: "محدود. IngramSpark يساعد.",
    trad: "Full reach: bookstores, libraries.",
    tradAr: "وصول كامل: مكتبات، مكتبات عامّة.",
  },
  {
    topic: "Rights control",
    topicAr: "حقوق التحكّم",
    indie: "100% — you own everything.",
    indieAr: "100% — تملك كل شيء.",
    trad: "Signed away for life of contract.",
    tradAr: "متنازل عنها طوال مدّة العقد.",
  },
  {
    topic: "Advance",
    topicAr: "السلفة",
    indie: "None.",
    indieAr: "لا توجد.",
    trad: "$2k–$500k+ (varies).",
    tradAr: "2000–500,000+ دولار (يتفاوت).",
  },
  {
    topic: "Risk",
    topicAr: "المخاطرة",
    indie: "Your money on the line.",
    indieAr: "أموالك على المحك.",
    trad: "Publisher absorbs the cost.",
    tradAr: "الناشر يتحمّل الكلفة.",
  },
];

// ── Platforms ─────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: "kdp",
    name: "Amazon KDP",
    blurb: "The biggest indie platform on earth. Print-on-demand paperback + ebook (Kindle).",
    blurbAr: "أكبر منصّة نشر مستقلّ. طباعة عند الطلب + كتاب إلكتروني (كيندل).",
    royalty: { ebook: "35% under $2.99, 70% from $2.99–$9.99", paperback: "60% minus print cost" },
    royaltyAr: { ebook: "35% تحت 2.99$، 70% من 2.99–9.99$", paperback: "60% ناقص كلفة الطباعة" },
    pros: ["Huge audience reach", "Free to use, no setup cost", "KDP Select gives access to Kindle Unlimited"],
    prosAr: ["وصول لجمهور ضخم", "مجّاني تماماً", "KDP Select يدخلك لـ Kindle Unlimited"],
    cons: ["Amazon-exclusive ebook lock for KDP Select (90 days)", "70% royalty needs $2.99+ pricing"],
    consAr: ["حصرية لأمازون 90 يوم في KDP Select", "70% تتطلّب تسعير 2.99$+"],
    url: "https://kdp.amazon.com",
  },
  {
    id: "ingramspark",
    name: "IngramSpark",
    blurb: "The bookstore gateway. Hardcover + paperback distribution to indie bookstores worldwide.",
    blurbAr: "بوّابة المكتبات. توزيع غلاف صلب وعادي للمكتبات المستقلّة عالميّاً.",
    royalty: { ebook: "40% (lower than KDP)", paperback: "Up to 45% retail; choose wholesale discount" },
    royaltyAr: { ebook: "40% (أقل من KDP)", paperback: "حتى 45%؛ اختر خصم البيع بالجملة" },
    pros: ["Hardcover available", "Real bookstore distribution", "Library wholesalers"],
    prosAr: ["غلاف صلب متوفّر", "توزيع مكتبات حقيقي", "موزّعون للمكتبات العامّة"],
    cons: ["~$49 setup per book ($25 ebook + $25 print)", "Lower ebook royalty than KDP"],
    consAr: ["~49$ كلفة إعداد لكل كتاب", "إتاوة كتاب إلكتروني أقلّ"],
    url: "https://www.ingramspark.com",
  },
  {
    id: "draft2digital",
    name: "Draft2Digital",
    blurb: "One upload, distributed to Apple, Kobo, Barnes & Noble, libraries — non-Amazon stores.",
    blurbAr: "رفع واحد، توزيع لـ Apple, Kobo, B&N, مكتبات — كل المتاجر غير أمازون.",
    royalty: { ebook: "60% of net (after retailer cut, typically 70% retail)", paperback: "55–70% net" },
    royaltyAr: { ebook: "60% من الصافي بعد خصم المتاجر", paperback: "55–70% صافي" },
    pros: ["Free, no per-book fees", "Universal book link", "Apple Books + Kobo reach"],
    prosAr: ["مجّاني، بدون رسوم لكل كتاب", "رابط كتاب موحّد", "وصول Apple + Kobo"],
    cons: ["You give up direct relationship with retailers"],
    consAr: ["تتنازل عن العلاقة المباشرة مع المتاجر"],
    url: "https://www.draft2digital.com",
  },
  {
    id: "acx",
    name: "ACX (Audible)",
    blurb: "Audiobook production + distribution to Audible, Amazon, Apple Books.",
    blurbAr: "إنتاج كتاب صوتي + توزيع لـ Audible وأمازون وApple Books.",
    royalty: { audiobook: "40% non-exclusive, 25% if narrator royalty-shares" },
    royaltyAr: { audiobook: "40% غير حصري، 25% إذا تشارك مع الراوي" },
    pros: ["Audible is the audiobook market", "Royalty Share lets you produce with no upfront cost"],
    prosAr: ["Audible هو سوق الكتب الصوتيّة", "Royalty Share يتيح الإنتاج بدون كلفة مقدّمة"],
    cons: ["US/UK/CA/IE only", "Exclusive deal pays 40%, non-exclusive only 25%"],
    consAr: ["متاح فقط لـ US/UK/CA/IE", "الحصري 40%، غير الحصري 25% فقط"],
    url: "https://www.acx.com",
  },
  {
    id: "findaway",
    name: "Findaway Voices",
    blurb: "Audiobook distribution to non-Audible platforms (Spotify, Apple, Google).",
    blurbAr: "توزيع كتب صوتيّة لمنصّات غير Audible (Spotify, Apple, Google).",
    royalty: { audiobook: "80% of net retailer payout (varies by store)" },
    royaltyAr: { audiobook: "80% من صافي عوائد المتجر (يتفاوت)" },
    pros: ["Wider non-Audible reach", "Spotify audiobooks now massive"],
    prosAr: ["وصول أوسع خارج Audible", "Spotify صار سوقاً كبيراً"],
    cons: ["You produce the audio yourself or hire", "Smaller ecosystem"],
    consAr: ["تنتج الصوت بنفسك أو تستأجر", "نظام بيئي أصغر"],
    url: "https://findawayvoices.com",
  },
];

// ── Royalty calculator ───────────────────────────────────────────

interface CalcInput {
  ebookPrice: number;       // USD
  paperbackPrice: number;   // USD
  paperbackPages: number;
  audiobookPrice: number;
  monthlySales: number;
}

interface PlatformEarning {
  platform: string;
  format: "ebook" | "paperback" | "audiobook";
  perCopy: number;
  monthly: number;
  yearly: number;
}

// Cost-of-print model for paperback POD (close to KDP's 2024 numbers).
// Black-and-white interior, 5.5x8.5 trim, white paper.
function paperbackPrintCost(pages: number): number {
  // KDP charges $1.00 base + $0.012 per page over 108
  return 1.0 + Math.max(0, pages) * 0.012;
}

function computeEarnings(input: CalcInput): PlatformEarning[] {
  const out: PlatformEarning[] = [];

  // KDP ebook (70% if 2.99 ≤ price ≤ 9.99)
  const kdpEbookRoy = input.ebookPrice >= 2.99 && input.ebookPrice <= 9.99 ? 0.70 : 0.35;
  out.push({
    platform: "Amazon KDP",
    format: "ebook",
    perCopy: +(input.ebookPrice * kdpEbookRoy).toFixed(2),
    monthly: +(input.ebookPrice * kdpEbookRoy * input.monthlySales).toFixed(2),
    yearly: +(input.ebookPrice * kdpEbookRoy * input.monthlySales * 12).toFixed(2),
  });

  // KDP paperback (60% royalty rate minus print cost)
  const kdpPbPerCopy = input.paperbackPrice * 0.60 - paperbackPrintCost(input.paperbackPages);
  out.push({
    platform: "Amazon KDP",
    format: "paperback",
    perCopy: +Math.max(0, kdpPbPerCopy).toFixed(2),
    monthly: +Math.max(0, kdpPbPerCopy * input.monthlySales).toFixed(2),
    yearly: +Math.max(0, kdpPbPerCopy * input.monthlySales * 12).toFixed(2),
  });

  // IngramSpark paperback — assume 45% wholesale discount = author keeps ~30% of retail minus print cost
  const isPbPerCopy = input.paperbackPrice * 0.30 - paperbackPrintCost(input.paperbackPages) * 1.1;
  out.push({
    platform: "IngramSpark",
    format: "paperback",
    perCopy: +Math.max(0, isPbPerCopy).toFixed(2),
    monthly: +Math.max(0, isPbPerCopy * input.monthlySales).toFixed(2),
    yearly: +Math.max(0, isPbPerCopy * input.monthlySales * 12).toFixed(2),
  });

  // Draft2Digital ebook (60% of net = ~60% × 70% retail)
  const d2dPerCopy = input.ebookPrice * 0.60 * 0.70;
  out.push({
    platform: "Draft2Digital",
    format: "ebook",
    perCopy: +d2dPerCopy.toFixed(2),
    monthly: +(d2dPerCopy * input.monthlySales).toFixed(2),
    yearly: +(d2dPerCopy * input.monthlySales * 12).toFixed(2),
  });

  // ACX exclusive audio at 40% of retail
  out.push({
    platform: "ACX (exclusive)",
    format: "audiobook",
    perCopy: +(input.audiobookPrice * 0.40).toFixed(2),
    monthly: +(input.audiobookPrice * 0.40 * input.monthlySales).toFixed(2),
    yearly: +(input.audiobookPrice * 0.40 * input.monthlySales * 12).toFixed(2),
  });

  return out;
}

// ── Component ─────────────────────────────────────────────────────

export function SelfPublishingTab({ ar }: { ar: boolean }) {
  const [calc, setCalc] = useState<CalcInput>({
    ebookPrice: 4.99,
    paperbackPrice: 14.99,
    paperbackPages: 280,
    audiobookPrice: 19.99,
    monthlySales: 100,
  });
  const earnings = useMemo(() => computeEarnings(calc), [calc]);

  return (
    <div style={{ fontFamily: SF, color: TEXT, display: "flex", flexDirection: "column", gap: 28 }}>
      {/* ─── Hero blurb ─── */}
      <section
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: "22px 22px",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.015em", marginBottom: 6 }}>
          {ar ? "النشر المستقلّ" : "Self-Publishing"}
        </div>
        <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.65, margin: 0, maxWidth: 720 }}>
          {ar
            ? "60% من الكتّاب اليوم ينشرون بشكل مستقلّ. تحتفظ بالحقوق، تحتفظ بأغلب العائدات، وتنشر بأسبوع لا بسنة. هاي الأدوات والأرقام الحقيقيّة."
            : "Most modern writers go indie. You keep your rights, you keep most of the royalty, you ship in a week instead of a year. Below are the real platforms, the real numbers, and a calculator that shows what you'd earn."}
        </p>
      </section>

      {/* ─── Comparison ─── */}
      <section>
        <SectionTitle ar={ar} en="Indie vs Traditional" arT="مستقلّ مقابل تقليدي" />
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 2fr 2fr",
              padding: "12px 16px",
              borderBottom: `1px solid ${BORDER}`,
              background: "rgba(255,255,255,0.025)",
              fontSize: 11,
              fontWeight: 700,
              color: MUTED2,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <div>{ar ? "" : ""}</div>
            <div>{ar ? "النشر المستقلّ" : "Indie"}</div>
            <div>{ar ? "التقليدي" : "Traditional"}</div>
          </div>
          {COMPARISON.map((row, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 2fr 2fr",
                padding: "12px 16px",
                borderBottom: i === COMPARISON.length - 1 ? "none" : `1px solid ${BORDER}`,
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700, color: TEXT }}>{ar ? row.topicAr : row.topic}</div>
              <div style={{ color: MUTED, display: "flex", alignItems: "flex-start", gap: 6 }}>
                <CheckCircle2 size={13} color="#86efac" style={{ flexShrink: 0, marginTop: 3 }} />
                <span>{ar ? row.indieAr : row.indie}</span>
              </div>
              <div style={{ color: MUTED, display: "flex", alignItems: "flex-start", gap: 6 }}>
                <XCircle size={13} color="#fca5a5" style={{ flexShrink: 0, marginTop: 3 }} />
                <span>{ar ? row.tradAr : row.trad}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Platforms ─── */}
      <section>
        <SectionTitle ar={ar} en="Platforms" arT="المنصّات" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {PLATFORMS.map((p) => (
            <div
              key={p.id}
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>{p.name}</div>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11.5,
                    color: MUTED,
                    textDecoration: "none",
                  }}
                >
                  {ar ? "زيارة" : "Visit"}
                  <ExternalLink size={11} />
                </a>
              </div>
              <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.55, margin: 0 }}>
                {ar ? p.blurbAr : p.blurb}
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.025)",
                  borderRadius: 9,
                  fontSize: 11.5,
                }}
              >
                {Object.entries(ar ? p.royaltyAr : p.royalty).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ color: MUTED2, textTransform: "capitalize" }}>{k}</span>
                    <span style={{ color: TEXT, fontWeight: 600, textAlign: ar ? "left" : "right" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {(ar ? p.prosAr : p.pros).map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 12, color: MUTED }}>
                    <CheckCircle2 size={11} color="#86efac" style={{ flexShrink: 0, marginTop: 3 }} />
                    <span>{t}</span>
                  </div>
                ))}
                {(ar ? p.consAr : p.cons).map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 12, color: MUTED }}>
                    <XCircle size={11} color="#fca5a5" style={{ flexShrink: 0, marginTop: 3 }} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Royalty calculator ─── */}
      <section>
        <SectionTitle ar={ar} en="Royalty calculator" arT="حاسبة الإتاوات" icon={<Calculator size={14} />} />
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: "18px 20px",
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr",
            gap: 24,
          }}
          className="self-pub-calc-grid"
        >
          <style>{`@media (max-width: 760px) { .self-pub-calc-grid { grid-template-columns: 1fr !important; } }`}</style>
          {/* Inputs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <NumInput label={ar ? "سعر الكتاب الإلكتروني ($)" : "Ebook price ($)"} value={calc.ebookPrice} step={0.5} onChange={(v) => setCalc({ ...calc, ebookPrice: v })} />
            <NumInput label={ar ? "سعر الورقي ($)" : "Paperback price ($)"} value={calc.paperbackPrice} step={1} onChange={(v) => setCalc({ ...calc, paperbackPrice: v })} />
            <NumInput label={ar ? "عدد صفحات الورقي" : "Paperback pages"} value={calc.paperbackPages} step={10} onChange={(v) => setCalc({ ...calc, paperbackPages: v })} />
            <NumInput label={ar ? "سعر الصوتي ($)" : "Audiobook price ($)"} value={calc.audiobookPrice} step={1} onChange={(v) => setCalc({ ...calc, audiobookPrice: v })} />
            <NumInput label={ar ? "المبيعات الشهريّة المتوقّعة" : "Expected monthly sales"} value={calc.monthlySales} step={10} onChange={(v) => setCalc({ ...calc, monthlySales: v })} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: MUTED2, fontSize: 11, lineHeight: 1.5 }}>
              <Info size={12} />
              {ar
                ? "أرقام تقريبيّة بالولايات المتّحدة. الأرقام الفعليّة تتفاوت حسب البلد، الضرائب، الخصم."
                : "Approximate US rates. Real numbers vary by country, taxes, and wholesale discount."}
            </div>
          </div>
          {/* Output */}
          <div
            style={{
              background: "rgba(255,255,255,0.025)",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 11, color: MUTED2, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
              {ar ? "صافي ما يصلك" : "Your take-home"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {earnings.map((e, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 70px 90px 90px",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: i === earnings.length - 1 ? "none" : `1px solid ${BORDER}`,
                    fontSize: 12.5,
                  }}
                >
                  <div>
                    <div style={{ color: TEXT, fontWeight: 700 }}>{e.platform}</div>
                    <div style={{ color: MUTED2, fontSize: 10.5, textTransform: "capitalize" }}>{e.format}</div>
                  </div>
                  <div style={{ color: MUTED, textAlign: "right" }}>${e.perCopy.toFixed(2)}/copy</div>
                  <div style={{ color: MUTED, textAlign: "right" }}>${e.monthly.toFixed(0)}/mo</div>
                  <div style={{ color: TEXT, fontWeight: 700, textAlign: "right" }}>${e.yearly.toFixed(0)}/yr</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Atoms ─────────────────────────────────────────────────────────

function SectionTitle({ en, arT, ar, icon }: { en: string; arT: string; ar: boolean; icon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      {icon && <span style={{ color: MUTED }}>{icon}</span>}
      <h3 style={{ fontSize: 15, fontWeight: 800, color: TEXT, letterSpacing: "-0.01em", margin: 0 }}>
        {ar ? arT : en}
      </h3>
    </div>
  );
}

function NumInput({
  label, value, step, onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        step={step}
        min={0}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        style={{
          fontFamily: SF,
          width: "100%",
          marginTop: 6,
          padding: "10px 12px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${BORDER}`,
          color: TEXT,
          fontSize: 13,
          fontVariantNumeric: "tabular-nums",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
