import { useLanguage } from "@/contexts/language-context";
import { GOLDEN_RULES } from "@/lib/course-golden-rules";
import { Mark } from "@/components/mobile/Marker";
import { PaperBall } from "@/components/mobile/PaperBall";

const SERIF = "'Lora', 'Amiri', Georgia, serif";
const HAND = "'Caveat', 'Aref Ruqaa', cursive";
const TYPE = "'Courier New', 'Noto Naskh Arabic', monospace";

// The module recap wall: five handwritten rules pinned at the end of
// every module, in the spirit of typewritten index cards. Deliberately
// mixes the site's four faces (typewriter label, serif title, hand
// rules, sans numbers) — the writer should feel a person wrote these.
export function GoldenRules({ moduleSlug }: { moduleSlug: string }) {
  const { isRTL } = useLanguage();
  const data = GOLDEN_RULES[moduleSlug];
  if (!data) return null;

  return (
    <section
      className="relative rounded-2xl border p-5 sm:p-7"
      style={{ background: "#fffdf7", borderColor: "rgba(66,53,33,0.16)", boxShadow: "0 10px 30px -18px rgba(41,33,21,0.3)" }}
    >
      {/* Crumpled drafts resting on the card corner, out of text flow */}
      <div aria-hidden className="absolute -top-4 end-3 flex gap-1.5" style={{ pointerEvents: "none" }}>
        <PaperBall size={30} rot={-18} />
        <PaperBall size={20} rot={24} style={{ marginTop: 10 }} />
      </div>

      <p
        className="text-[10px] font-bold uppercase"
        style={{ fontFamily: TYPE, letterSpacing: "0.22em", color: "#7b7366" }}
      >
        {isRTL ? "القواعد الذهبية" : "The Golden Rules"}
      </p>
      <h2
        className="mt-1.5 text-xl sm:text-2xl font-bold"
        style={{ fontFamily: SERIF, color: "#2f2618" }}
      >
        {isRTL ? (
          <>خمس قواعد <Mark ar={isRTL}>خذها معك</Mark></>
        ) : (
          <>Five rules <Mark ar={isRTL}>to keep</Mark></>
        )}
      </h2>
      <p
        className="mt-1"
        style={{ fontFamily: HAND, fontSize: isRTL ? 14 : 16.5, color: "#8a8070", transform: "rotate(-0.5deg)", display: "inline-block" }}
      >
        {isRTL ? "(لو نسيت الوحدة كلها، لا تنسى هذول)" : "(forget the whole module if you must, never these)"}
      </p>

      <ol className="mt-5 space-y-4">
        {data.rules.map((r, i) => (
          <li key={i} className="flex items-start gap-3.5">
            <span
              aria-hidden
              className="shrink-0 leading-none select-none -mt-0.5"
              style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 800, color: "#cbb896", fontVariantNumeric: "tabular-nums" }}
            >
              {i + 1}
            </span>
            <p
              className="min-w-0 leading-relaxed"
              style={{
                fontFamily: HAND,
                fontSize: isRTL ? 16 : 19.5,
                color: "#423521",
                transform: `rotate(${i % 2 === 0 ? -0.4 : 0.4}deg)`,
              }}
            >
              {isRTL ? r.ar : r.en}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
