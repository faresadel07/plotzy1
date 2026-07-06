import { useId, type JSX, type ReactNode } from "react";
import { Diagram } from "@/components/course/visuals/Diagram";
import { useLanguage } from "@/contexts/language-context";

/**
 * DiagramLibrary: named, hand-crafted inline SVG diagrams for the writing
 * course. Referenced from lesson content as `:::diagram <name>`.
 *
 * - Bilingual labels (en/ar). Geometry stays left-to-right in both languages;
 *   only the words change.
 * - Theme-aware: colors only via Tailwind classes (fill-foreground,
 *   stroke-primary, ...). No hardcoded hex.
 * - Responsive: viewBox + width 100%, font sizes 14-20 inside the viewBox.
 */

type L = { en: string; ar: string };

function useDiag() {
  const { isRTL } = useLanguage();
  const t = (l: L) => (isRTL ? l.ar : l.en);
  // Physical anchors. In an RTL document SVG text-anchor start/end flip,
  // so swap them to keep labels on the intended physical side.
  const S: "start" | "end" = isRTL ? "end" : "start"; // text extends right of x
  const E: "start" | "end" = isRTL ? "start" : "end"; // text extends left of x
  return { t, S, E, isRTL };
}

/** Shared text element: inherits the page font, colored via theme tokens. */
function T({
  x,
  y,
  size = 15,
  weight,
  tone = "fg",
  anchor = "middle",
  children,
}: {
  x: number;
  y: number;
  size?: number;
  weight?: number;
  tone?: "fg" | "muted" | "primary";
  anchor?: "start" | "middle" | "end";
  children: ReactNode;
}) {
  const cls =
    tone === "primary"
      ? "fill-primary"
      : tone === "muted"
        ? "fill-muted-foreground"
        : "fill-foreground";
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={weight}
      textAnchor={anchor}
      className={cls}
      style={{ fontFamily: "inherit" }}
    >
      {children}
    </text>
  );
}

/** Arrowhead markers, ids namespaced per diagram instance. */
function Arrows({ uid }: { uid: string }) {
  const head = "M 0.5 1 L 9 5 L 0.5 9 Z";
  const common = {
    viewBox: "0 0 10 10",
    refX: 8.5,
    refY: 5,
    markerWidth: 11,
    markerHeight: 11,
    markerUnits: "userSpaceOnUse" as const,
    orient: "auto-start-reverse" as const,
  };
  return (
    <defs>
      <marker id={`${uid}-af`} {...common}>
        <path d={head} className="fill-foreground" />
      </marker>
      <marker id={`${uid}-ap`} {...common}>
        <path d={head} className="fill-primary" />
      </marker>
      <marker id={`${uid}-am`} {...common}>
        <path d={head} className="fill-muted-foreground" />
      </marker>
    </defs>
  );
}

function useUid() {
  return useId().replace(/:/g, "");
}

/* ------------------------------------------------------------------ */
/* 1. three-act-curve                                                  */
/* ------------------------------------------------------------------ */

function ThreeActCurve() {
  const { t, E } = useDiag();
  const curve =
    "M 60 272 C 90 264, 108 256, 130 248 C 156 238, 186 220, 210 205 " +
    "C 258 178, 322 148, 360 140 C 396 148, 430 172, 460 185 " +
    "C 495 168, 535 110, 560 88 C 588 102, 628 132, 660 150";
  const pts: [number, number][] = [
    [130, 248],
    [210, 205],
    [360, 140],
    [460, 185],
    [560, 88],
    [660, 150],
  ];
  const pcts = [
    { x: 60, l: "0" },
    { x: 210, l: "25" },
    { x: 360, l: "50" },
    { x: 510, l: "75" },
    { x: 660, l: "100" },
  ];
  return (
    <svg viewBox="0 0 720 360" width="100%" height="auto" aria-hidden="true">
      {/* area under the curve */}
      <path d={`${curve} L 660 290 L 60 290 Z`} className="fill-primary" fillOpacity={0.12} />
      {/* act boundaries */}
      <line x1={210} y1={70} x2={210} y2={290} className="stroke-border" strokeWidth={2} strokeDasharray="4 6" />
      <line x1={510} y1={70} x2={510} y2={290} className="stroke-border" strokeWidth={2} strokeDasharray="4 6" />
      {/* axis */}
      <line x1={60} y1={290} x2={660} y2={290} className="stroke-foreground" strokeWidth={2} strokeLinecap="round" />
      {pcts.map((p) => (
        <g key={p.l}>
          <line x1={p.x} y1={290} x2={p.x} y2={298} className="stroke-foreground" strokeWidth={2} strokeLinecap="round" />
          <T x={p.x} y={314} size={14} tone="muted">{p.l}</T>
        </g>
      ))}
      {/* tension curve */}
      <path d={curve} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={5} className="fill-primary stroke-card" strokeWidth={2} />
      ))}
      {/* point labels, each offset into clear space with a short leader */}
      <line x1={130} y1={245} x2={126} y2={239} className="stroke-border" strokeWidth={1.5} />
      <T x={122} y={236} size={14} anchor={E}>{t({ en: "Inciting incident", ar: "الحادثة المحرّكة" })}</T>
      <T x={198} y={192} size={14} anchor={E}>{t({ en: "Lock-in", ar: "نقطة اللاعودة" })}</T>
      <T x={360} y={122} size={14}>{t({ en: "Midpoint reversal", ar: "انقلاب المنتصف" })}</T>
      <line x1={460} y1={190} x2={460} y2={204} className="stroke-border" strokeWidth={1.5} />
      <T x={460} y={220} size={14}>{t({ en: "Dark moment", ar: "اللحظة المظلمة" })}</T>
      <T x={560} y={68} size={14} weight={600}>{t({ en: "Climax", ar: "الذروة" })}</T>
      <line x1={660} y1={155} x2={660} y2={168} className="stroke-border" strokeWidth={1.5} />
      <T x={660} y={184} size={14} anchor={E}>{t({ en: "Denouement", ar: "الخاتمة" })}</T>
      {/* act labels */}
      <T x={135} y={340} weight={600}>{t({ en: "Act 1", ar: "الفصل الأول" })}</T>
      <T x={360} y={340} weight={600}>{t({ en: "Act 2", ar: "الفصل الثاني" })}</T>
      <T x={585} y={340} weight={600}>{t({ en: "Act 3", ar: "الفصل الثالث" })}</T>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 2. heros-journey-circle                                             */
/* ------------------------------------------------------------------ */

function HerosJourneyCircle() {
  const { t, S, E } = useDiag();
  const cx = 360;
  const cy = 210;
  const r = 120;
  const labels: { x: number; y: number; a: "start" | "middle" | "end"; l: L }[] = [
    { x: 360, y: 52, a: "middle", l: { en: "Ordinary world", ar: "العالم المألوف" } },
    { x: 478, y: 102, a: S, l: { en: "The call", ar: "النداء" } },
    { x: 526, y: 215, a: S, l: { en: "Refusal", ar: "الرفض" } },
    { x: 478, y: 330, a: S, l: { en: "The mentor", ar: "المرشد" } },
    { x: 360, y: 372, a: "middle", l: { en: "Trials", ar: "الاختبارات" } },
    { x: 242, y: 330, a: E, l: { en: "The ordeal", ar: "المحنة" } },
    { x: 194, y: 215, a: E, l: { en: "The reward", ar: "المكافأة" } },
    { x: 242, y: 102, a: E, l: { en: "The return", ar: "العودة" } },
  ];
  return (
    <svg viewBox="0 0 720 400" width="100%" height="auto" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" className="stroke-foreground" strokeWidth={2} />
      {/* 8 segment boundaries */}
      {Array.from({ length: 8 }, (_, k) => {
        const a = ((22.5 + k * 45) * Math.PI) / 180;
        return (
          <line
            key={k}
            x1={cx + 112 * Math.sin(a)}
            y1={cy - 112 * Math.cos(a)}
            x2={cx + 128 * Math.sin(a)}
            y2={cy - 128 * Math.cos(a)}
            className="stroke-foreground"
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
      {/* clockwise flow arrow at the rightmost point */}
      <polygon points="473,206 487,206 480,222" className="fill-primary" />
      {/* known / unknown split */}
      <line x1={244} y1={210} x2={468} y2={210} className="stroke-border" strokeWidth={2} strokeDasharray="5 6" />
      <T x={360} y={182} size={14} tone="muted">{t({ en: "The known world", ar: "العالم المعروف" })}</T>
      <T x={360} y={248} size={14} tone="muted">{t({ en: "The unknown world", ar: "العالم المجهول" })}</T>
      {/* stage labels */}
      {labels.map((s, i) => (
        <T key={i} x={s.x} y={s.y} anchor={s.a} weight={i === 0 ? 600 : undefined}>
          {t(s.l)}
        </T>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 3. beat-map                                                         */
/* ------------------------------------------------------------------ */

function BeatMap() {
  const { t, S, E } = useDiag();
  const px = (p: number) => 40 + 6.4 * p;
  const beats: {
    x: number;
    pct: L;
    l: L;
    side: "top" | "bottom";
    a: "start" | "middle" | "end";
    ax?: number;
  }[] = [
    { x: px(1), pct: { en: "1%", ar: "1%" }, l: { en: "Opening image", ar: "الصورة الافتتاحية" }, side: "top", a: S, ax: 42 },
    { x: px(10), pct: { en: "10%", ar: "10%" }, l: { en: "Catalyst", ar: "الحادثة المحرّكة" }, side: "bottom", a: "middle" },
    { x: px(20), pct: { en: "20%", ar: "20%" }, l: { en: "Break into two", ar: "الدخول في الفصل الثاني" }, side: "top", a: S, ax: 172 },
    { x: px(50), pct: { en: "50%", ar: "50%" }, l: { en: "Midpoint", ar: "انقلاب المنتصف" }, side: "bottom", a: "middle" },
    { x: px(75), pct: { en: "75%", ar: "75%" }, l: { en: "All is lost", ar: "ضياع كل شيء" }, side: "top", a: "middle" },
    { x: px(80), pct: { en: "80%", ar: "80%" }, l: { en: "Dark night", ar: "الليلة المظلمة" }, side: "bottom", a: E, ax: 556 },
    { x: px(92), pct: { en: "85 to 99%", ar: "85 إلى 99%" }, l: { en: "Finale", ar: "الخاتمة الكبرى" }, side: "top", a: "middle" },
    { x: px(100), pct: { en: "100%", ar: "100%" }, l: { en: "Final image", ar: "الصورة الختامية" }, side: "bottom", a: E, ax: 684 },
  ];
  return (
    <svg viewBox="0 0 720 260" width="100%" height="auto" aria-hidden="true">
      {/* the manuscript bar */}
      <rect x={40} y={140} width={640} height={28} rx={6} className="fill-primary stroke-border" fillOpacity={0.1} strokeWidth={2} />
      {/* finale band, 85 to 99 */}
      <rect x={px(85)} y={140} width={px(99) - px(85)} height={28} className="fill-primary" fillOpacity={0.25} />
      <T x={264} y={159} size={14} tone="muted">{t({ en: "The manuscript", ar: "المخطوطة" })}</T>
      {beats.map((b, i) => {
        const top = b.side === "top";
        const lx = b.ax ?? b.x;
        return (
          <g key={i}>
            <line x1={b.x} y1={140} x2={b.x} y2={168} className="stroke-border" strokeWidth={2} />
            <line
              x1={b.x}
              y1={top ? 106 : 170}
              x2={b.x}
              y2={top ? 138 : 200}
              className="stroke-border"
              strokeWidth={2}
            />
            <T x={lx} y={top ? 78 : 238} size={14} weight={600} anchor={b.a}>{t(b.l)}</T>
            <T x={b.x} y={top ? 98 : 218} size={14} tone="muted">{t(b.pct)}</T>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 4. scene-value-shift                                                */
/* ------------------------------------------------------------------ */

function SceneValueShift() {
  const { t } = useDiag();
  const uid = useUid();
  const steps: { x: number; l: L }[] = [
    { x: 210, l: { en: "Goal", ar: "الهدف" } },
    { x: 316, l: { en: "Conflict", ar: "الصراع" } },
    { x: 422, l: { en: "Turn", ar: "الانقلاب" } },
  ];
  return (
    <svg viewBox="0 0 720 300" width="100%" height="auto" aria-hidden="true">
      <Arrows uid={uid} />
      {/* scene box */}
      <rect x={200} y={90} width={320} height={140} rx={16} className="fill-card stroke-foreground" strokeWidth={2} />
      <T x={360} y={118} size={16} weight={600}>{t({ en: "The scene", ar: "المشهد" })}</T>
      {steps.map((s, i) => (
        <g key={i}>
          <rect x={s.x} y={146} width={88} height={48} rx={10} className="fill-primary stroke-border" fillOpacity={0.1} strokeWidth={2} />
          <T x={s.x + 44} y={175} size={14}>{t(s.l)}</T>
        </g>
      ))}
      <polyline points="303,162 311,170 303,178" fill="none" className="stroke-muted-foreground" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="409,162 417,170 409,178" fill="none" className="stroke-muted-foreground" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* entering: minus charge */}
      <circle cx={90} cy={160} r={16} className="fill-card stroke-foreground" strokeWidth={2} />
      <line x1={82} y1={160} x2={98} y2={160} className="stroke-foreground" strokeWidth={2.5} strokeLinecap="round" />
      <line x1={110} y1={160} x2={186} y2={160} className="stroke-foreground" strokeWidth={2} strokeLinecap="round" markerEnd={`url(#${uid}-af)`} />
      <T x={126} y={212} size={14} tone="muted">{t({ en: "Safe, unaware", ar: "آمن، غافل" })}</T>
      {/* exiting: plus charge */}
      <line x1={524} y1={160} x2={622} y2={160} className="stroke-primary" strokeWidth={2} strokeLinecap="round" markerEnd={`url(#${uid}-ap)`} />
      <circle cx={648} cy={160} r={16} className="stroke-primary fill-primary" fillOpacity={0.15} strokeWidth={2} />
      <line x1={640} y1={160} x2={656} y2={160} className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" />
      <line x1={648} y1={152} x2={648} y2={168} className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" />
      <T x={600} y={212} size={14} tone="muted">{t({ en: "In danger, knows the truth", ar: "في خطر، يعرف الحقيقة" })}</T>
      {/* the flip */}
      <T x={360} y={276} weight={600}>
        {t({ en: "Value shift: from minus to plus", ar: "انقلاب القيمة: من سالب إلى موجب" })}
      </T>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 5. wound-want-need                                                  */
/* ------------------------------------------------------------------ */

function WoundWantNeed() {
  const { t, E } = useDiag();
  const uid = useUid();
  return (
    <svg viewBox="0 0 720 410" width="100%" height="auto" aria-hidden="true">
      <Arrows uid={uid} />
      {/* wound -> want (left edge) */}
      <line x1={330.3} y1={109.7} x2={179.7} y2={260.3} className="stroke-foreground" strokeWidth={2} strokeLinecap="round" markerEnd={`url(#${uid}-af)`} />
      <T x={238} y={172} size={14} anchor={E}>{t({ en: "causes", ar: "يسبب" })}</T>
      {/* wound -> need (right edge, plain) */}
      <line x1={389.7} y1={109.7} x2={540.3} y2={260.3} className="stroke-border" strokeWidth={2} strokeLinecap="round" />
      {/* want hides need (bottom edge) */}
      <line x1={196} y1={290} x2={516} y2={290} className="stroke-muted-foreground" strokeWidth={2} strokeDasharray="6 6" markerEnd={`url(#${uid}-am)`} />
      <T x={356} y={272} size={14} tone="muted">{t({ en: "the want hides the need", ar: "الرغبة تخفي الحاجة" })}</T>
      {/* corner nodes */}
      <circle cx={360} cy={80} r={42} className="fill-card stroke-foreground" strokeWidth={2} />
      <circle cx={150} cy={290} r={42} className="fill-card stroke-foreground" strokeWidth={2} />
      <circle cx={570} cy={290} r={42} className="fill-card stroke-primary" strokeWidth={2} />
      <T x={360} y={86} size={16} weight={600}>{t({ en: "Wound", ar: "الجرح" })}</T>
      <T x={150} y={296} size={16} weight={600}>{t({ en: "Want", ar: "الرغبة" })}</T>
      <T x={570} y={296} size={16} weight={600}>{t({ en: "Need", ar: "الحاجة" })}</T>
      {/* the story arc, highlighted */}
      <path d="M 176 324 Q 360 392 524 324" fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" markerEnd={`url(#${uid}-ap)`} />
      <T x={360} y={396} weight={600} tone="primary">
        {t({ en: "the story moves from want to need", ar: "الحكاية تنقل البطل من الرغبة إلى الحاجة" })}
      </T>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 6. pov-distances                                                    */
/* ------------------------------------------------------------------ */

function PovDistances() {
  const { t, S, E } = useDiag();
  const uid = useUid();
  // Arcs centered on the character (600,165), spanning 150 to 210 degrees.
  const arc = (r: number) => {
    const x = 600 - 0.866 * r;
    return `M ${x} ${165 - 0.5 * r} A ${r} ${r} 0 0 0 ${x} ${165 + 0.5 * r}`;
  };
  return (
    <svg viewBox="0 0 720 340" width="100%" height="auto" aria-hidden="true">
      <Arrows uid={uid} />
      {/* camera (the narrator) */}
      <rect x={70} y={138} width={64} height={54} rx={10} className="fill-card stroke-foreground" strokeWidth={2} />
      <rect x={84} y={126} width={22} height={12} rx={4} className="fill-card stroke-foreground" strokeWidth={2} />
      <circle cx={102} cy={165} r={11} fill="none" className="stroke-foreground" strokeWidth={2} />
      <polygon points="134,152 166,140 166,190 134,178" className="fill-card stroke-foreground" strokeWidth={2} strokeLinejoin="round" />
      <T x={108} y={222} size={14} tone="muted">{t({ en: "the narrator", ar: "الراوي" })}</T>
      {/* sight line */}
      <line x1={176} y1={165} x2={382} y2={165} className="stroke-border" strokeWidth={2} strokeDasharray="4 6" />
      {/* character */}
      <circle cx={600} cy={120} r={16} fill="none" className="stroke-foreground" strokeWidth={2} />
      <line x1={600} y1={136} x2={600} y2={190} className="stroke-foreground" strokeWidth={2} strokeLinecap="round" />
      <line x1={575} y1={158} x2={625} y2={158} className="stroke-foreground" strokeWidth={2} strokeLinecap="round" />
      <line x1={600} y1={190} x2={580} y2={225} className="stroke-foreground" strokeWidth={2} strokeLinecap="round" />
      <line x1={600} y1={190} x2={620} y2={225} className="stroke-foreground" strokeWidth={2} strokeLinecap="round" />
      <T x={600} y={248} size={14} tone="muted">{t({ en: "the character", ar: "الشخصية" })}</T>
      {/* distance arcs */}
      <path d={arc(70)} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" />
      <path d={arc(140)} fill="none" className="stroke-foreground" strokeWidth={2} strokeLinecap="round" />
      <path d={arc(210)} fill="none" className="stroke-muted-foreground" strokeWidth={2} strokeLinecap="round" strokeDasharray="2 7" />
      {/* arc labels: each sits just left of its arc's top point (stacked
          diagonally up-left into open space) with a short leader dot. */}
      <line x1={536} y1={129} x2={539} y2={131} className="stroke-primary" strokeWidth={2} strokeLinecap="round" />
      <T x={532} y={128} size={14} anchor={E} weight={600}>{t({ en: "First person: inside the head", ar: "ضمير المتكلم: داخل الرأس" })}</T>
      <line x1={476} y1={94} x2={479} y2={96} className="stroke-foreground" strokeWidth={2} strokeLinecap="round" />
      <T x={472} y={93} size={14} anchor={E} weight={600}>{t({ en: "Third limited: on the shoulder", ar: "الغائب المحدود: على الكتف" })}</T>
      <line x1={415} y1={59} x2={418} y2={61} className="stroke-muted-foreground" strokeWidth={2} strokeLinecap="round" />
      <T x={411} y={58} size={14} anchor={E} weight={600}>{t({ en: "Omniscient: above the world", ar: "الراوي العليم: فوق العالم" })}</T>
      {/* narrative distance axis */}
      <line x1={206} y1={310} x2={554} y2={310} className="stroke-foreground" strokeWidth={2} markerStart={`url(#${uid}-af)`} markerEnd={`url(#${uid}-af)`} />
      <T x={380} y={298} size={14} tone="muted">{t({ en: "Narrative distance", ar: "المسافة السردية" })}</T>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 7. tension-curve                                                    */
/* ------------------------------------------------------------------ */

function TensionCurve() {
  const { t, S, E } = useDiag();
  const uid = useUid();
  return (
    <svg viewBox="0 0 720 320" width="100%" height="auto" aria-hidden="true">
      <Arrows uid={uid} />
      {/* the sag zone */}
      <rect x={220} y={190} width={260} height={88} rx={8} className="fill-foreground" fillOpacity={0.06} />
      <T x={350} y={262} size={14} tone="muted">{t({ en: "the sag zone", ar: "منطقة الترهّل" })}</T>
      {/* axes */}
      <line x1={60} y1={285} x2={60} y2={46} className="stroke-foreground" strokeWidth={2} strokeLinecap="round" markerEnd={`url(#${uid}-af)`} />
      <line x1={55} y1={280} x2={666} y2={280} className="stroke-foreground" strokeWidth={2} strokeLinecap="round" markerEnd={`url(#${uid}-af)`} />
      <T x={52} y={30} size={14} anchor={S} tone="muted">{t({ en: "Tension", ar: "التوتر" })}</T>
      <T x={666} y={304} size={14} anchor={E} tone="muted">{t({ en: "Chapters", ar: "الفصول" })}</T>
      {/* sagging middle: flat then spike */}
      <path
        d="M 64 258 C 120 226, 160 218, 220 220 C 320 226, 400 232, 480 228 C 540 224, 590 150, 620 70"
        fill="none"
        className="stroke-muted-foreground"
        strokeWidth={2}
        strokeDasharray="7 7"
        strokeLinecap="round"
      />
      <T x={500} y={254} size={14} anchor={S} tone="muted">{t({ en: "Flat, then a late spike", ar: "مسطّح ثم قفزة متأخرة" })}</T>
      {/* healthy rising sawtooth */}
      <polyline
        points="64,258 120,196 150,222 210,158 245,188 310,128 350,162 420,104 460,138 540,76 580,108 648,52"
        fill="none"
        className="stroke-primary"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <T x={655} y={38} anchor={E} weight={600} tone="primary">{t({ en: "Healthy: rising waves", ar: "صحّي: موجات صاعدة" })}</T>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 8. revision-funnel                                                  */
/* ------------------------------------------------------------------ */

function RevisionFunnel() {
  const { t, S } = useDiag();
  const uid = useUid();
  const bands: { pts: string; op: number; title: L; sub: L; ty: number }[] = [
    {
      pts: "60,40 500,40 450,130 110,130",
      op: 0.08,
      title: { en: "Structural pass", ar: "مرور بنيوي" },
      sub: { en: "the whole book", ar: "الكتاب كله" },
      ty: 78,
    },
    {
      pts: "115,140 445,140 400,230 160,230",
      op: 0.14,
      title: { en: "Scene pass", ar: "مرور مشهدي" },
      sub: { en: "chapters and scenes", ar: "الفصول والمشاهد" },
      ty: 178,
    },
    {
      pts: "165,240 395,240 350,330 210,330",
      op: 0.2,
      title: { en: "Line pass", ar: "مرور جُملي" },
      sub: { en: "sentences and words", ar: "الجمل والكلمات" },
      ty: 278,
    },
  ];
  return (
    <svg viewBox="0 0 720 360" width="100%" height="auto" aria-hidden="true">
      <Arrows uid={uid} />
      {bands.map((b, i) => (
        <g key={i}>
          <polygon points={b.pts} className="fill-primary stroke-border" fillOpacity={b.op} strokeWidth={2} strokeLinejoin="round" />
          <T x={280} y={b.ty} size={16} weight={600}>{t(b.title)}</T>
          <T x={280} y={b.ty + 24} size={14} tone="muted">{t(b.sub)}</T>
        </g>
      ))}
      {/* order matters, big to small */}
      <line x1={545} y1={48} x2={545} y2={316} className="stroke-foreground" strokeWidth={2} strokeLinecap="round" markerEnd={`url(#${uid}-af)`} />
      <T x={562} y={168} anchor={S} weight={600}>{t({ en: "Order matters:", ar: "الترتيب مهم:" })}</T>
      <T x={562} y={192} size={14} anchor={S} tone="muted">{t({ en: "big to small", ar: "من الكبير إلى الصغير" })}</T>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 9. publishing-paths                                                 */
/* ------------------------------------------------------------------ */

function PublishingPaths() {
  const { t } = useDiag();
  const uid = useUid();
  const left: L[] = [
    { en: "Query letter", ar: "رسالة الاستعلام" },
    { en: "Literary agent", ar: "الوكيل الأدبي" },
    { en: "Publisher", ar: "دار النشر" },
    { en: "Bookstore", ar: "المكتبة" },
  ];
  const right: L[] = [
    { en: "Edit and design", ar: "التحرير والتصميم" },
    { en: "Platform upload", ar: "الرفع على المنصة" },
    { en: "Reader", ar: "القارئ" },
  ];
  const rowY = [142, 206, 270, 334];
  const col = (cx: number, items: L[]) => (
    <g>
      {items.map((l, i) => (
        <g key={i}>
          <rect x={cx - 100} y={rowY[i]} width={200} height={42} rx={10} className="fill-card stroke-border" strokeWidth={2} />
          <T x={cx} y={rowY[i] + 26} size={15}>{t(l)}</T>
          {i < items.length - 1 && (
            <line x1={cx} y1={rowY[i] + 46} x2={cx} y2={rowY[i] + 56} className="stroke-foreground" strokeWidth={2} markerEnd={`url(#${uid}-af)`} />
          )}
        </g>
      ))}
    </g>
  );
  return (
    <svg viewBox="0 0 720 430" width="100%" height="auto" aria-hidden="true">
      <Arrows uid={uid} />
      {/* manuscript */}
      <rect x={295} y={28} width={130} height={44} rx={10} className="fill-primary stroke-primary" fillOpacity={0.12} strokeWidth={2} />
      <T x={360} y={55} size={15} weight={600}>{t({ en: "Manuscript", ar: "المخطوطة" })}</T>
      {/* branches */}
      <path d="M 360 72 C 360 92, 180 88, 180 104" fill="none" className="stroke-foreground" strokeWidth={2} markerEnd={`url(#${uid}-af)`} />
      <path d="M 360 72 C 360 92, 540 88, 540 104" fill="none" className="stroke-foreground" strokeWidth={2} markerEnd={`url(#${uid}-af)`} />
      <T x={180} y={128} size={16} weight={600}>{t({ en: "Traditional", ar: "النشر التقليدي" })}</T>
      <T x={540} y={128} size={16} weight={600}>{t({ en: "Self publishing", ar: "النشر الذاتي" })}</T>
      {col(180, left)}
      {col(540, right)}
      {/* tradeoffs */}
      <T x={180} y={410} size={14} tone="muted">{t({ en: "More time, less control", ar: "وقت أطول، تحكّم أقل" })}</T>
      <T x={540} y={410} size={14} tone="muted">{t({ en: "Less time, more control", ar: "وقت أقل، تحكّم أكبر" })}</T>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 10. premise-formula                                                 */
/* ------------------------------------------------------------------ */

function PremiseFormula() {
  const { t } = useDiag();
  const parts: L[] = [
    { en: "Character", ar: "الشخصية" },
    { en: "Want", ar: "الرغبة" },
    { en: "Obstacle", ar: "العقبة" },
    { en: "Stakes", ar: "الرهان" },
  ];
  const xs = [55, 215, 375, 535];
  const plus = [200, 360, 520];
  return (
    <svg viewBox="0 0 720 270" width="100%" height="auto" aria-hidden="true">
      {parts.map((p, i) => (
        <g key={i}>
          <rect x={xs[i]} y={60} width={130} height={50} rx={10} className="fill-card stroke-border" strokeWidth={2} />
          <T x={xs[i] + 65} y={90} size={15}>{t(p)}</T>
        </g>
      ))}
      {plus.map((x) => (
        <g key={x}>
          <line x1={x - 9} y1={85} x2={x + 9} y2={85} className="stroke-foreground" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={x} y1={76} x2={x} y2={94} className="stroke-foreground" strokeWidth={2.5} strokeLinecap="round" />
        </g>
      ))}
      {/* equals */}
      <line x1={344} y1={128} x2={376} y2={128} className="stroke-primary" strokeWidth={3} strokeLinecap="round" />
      <line x1={344} y1={138} x2={376} y2={138} className="stroke-primary" strokeWidth={3} strokeLinecap="round" />
      {/* result */}
      <rect x={110} y={156} width={500} height={54} rx={12} className="fill-primary stroke-primary" fillOpacity={0.12} strokeWidth={2} />
      <T x={360} y={189} size={16} weight={600}>
        {t({ en: "Premise: one sentence under pressure", ar: "الفرضية: جملة واحدة تحت الضغط" })}
      </T>
      {/* the promise */}
      <line x1={170} y1={230} x2={550} y2={230} className="stroke-border" strokeWidth={2} />
      <T x={360} y={254} size={14} tone="muted">
        {t({ en: "The promise: what these pages sign with the reader", ar: "الوعد: ما توقّعه هذه الصفحات مع القارئ" })}
      </T>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 11. story-vs-plot                                                   */
/* ------------------------------------------------------------------ */

function StoryVsPlot() {
  const { t, S } = useDiag();
  const uid = useUid();
  const box = (x: number, y: number, l: L) => (
    <g>
      <rect x={x} y={y} width={170} height={50} rx={10} className="fill-card stroke-border" strokeWidth={2} />
      <T x={x + 85} y={y + 30} size={15}>{t(l)}</T>
    </g>
  );
  const king: L = { en: "The king died", ar: "مات الملك" };
  const queen: L = { en: "The queen died", ar: "ماتت الملكة" };
  return (
    <svg viewBox="0 0 720 270" width="100%" height="auto" aria-hidden="true">
      <Arrows uid={uid} />
      {/* plot row: A then B */}
      <T x={48} y={90} size={16} weight={600} anchor={S}>{t({ en: "Plot", ar: "الحبكة" })}</T>
      {box(160, 60, king)}
      {box(430, 60, queen)}
      <line x1={338} y1={85} x2={418} y2={85} className="stroke-muted-foreground" strokeWidth={2} markerEnd={`url(#${uid}-am)`} />
      <T x={378} y={70} size={14} tone="muted">{t({ en: "then", ar: "ثم" })}</T>
      {/* story row: A because B */}
      <T x={48} y={220} size={16} weight={600} anchor={S}>{t({ en: "Story", ar: "الحكاية" })}</T>
      {box(160, 190, king)}
      {box(430, 190, queen)}
      <path d="M 338 208 C 356 186, 400 186, 418 206" fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" markerEnd={`url(#${uid}-ap)`} />
      <T x={378} y={172} weight={600} tone="primary">{t({ en: "because of grief", ar: "حزنًا عليه" })}</T>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 12. show-dont-tell-iceberg                                          */
/* ------------------------------------------------------------------ */

function ShowDontTellIceberg() {
  const { t, S } = useDiag();
  const uid = useUid();
  return (
    <svg viewBox="0 0 720 400" width="100%" height="auto" aria-hidden="true">
      <Arrows uid={uid} />
      {/* water */}
      <rect x={40} y={140} width={640} height={236} className="fill-primary" fillOpacity={0.06} />
      <line x1={40} y1={140} x2={680} y2={140} className="stroke-primary" strokeWidth={2} strokeLinecap="round" />
      {/* iceberg mass, below the surface */}
      <polygon
        points="308,140 424,140 498,214 462,318 352,354 252,296 284,196"
        className="fill-primary stroke-foreground"
        fillOpacity={0.1}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* visible tip */}
      <polygon
        points="308,140 345,64 392,98 424,140"
        className="fill-primary stroke-foreground"
        fillOpacity={0.3}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* tip label */}
      <line x1={400} y1={94} x2={456} y2={78} className="stroke-border" strokeWidth={2} strokeDasharray="3 5" />
      <T x={470} y={78} size={16} weight={600} anchor={S}>{t({ en: "What you write", ar: "ما تكتبه" })}</T>
      <T x={470} y={100} size={14} anchor={S} tone="muted">{t({ en: "action, detail, dialogue", ar: "فعل، تفصيل، حوار" })}</T>
      {/* mass label */}
      <line x1={490} y1={250} x2={512} y2={242} className="stroke-border" strokeWidth={2} strokeDasharray="3 5" />
      <T x={524} y={244} size={16} weight={600} anchor={S}>{t({ en: "What the reader feels", ar: "ما يشعر به القارئ" })}</T>
      <T x={524} y={268} size={14} anchor={S} tone="muted">{t({ en: "emotion, meaning", ar: "العاطفة، المعنى" })}</T>
      {/* the reader dives */}
      <path d="M 150 92 C 118 160, 126 240, 176 292" fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" markerEnd={`url(#${uid}-ap)`} />
      <T x={148} y={66} weight={600} tone="primary">{t({ en: "The reader dives", ar: "القارئ يغوص" })}</T>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Registry and public component                                       */
/* ------------------------------------------------------------------ */

interface DiagramEntry {
  aria: L;
  Component: () => JSX.Element;
}

const DIAGRAMS: Record<string, DiagramEntry> = {
  "three-act-curve": {
    aria: {
      en: "Rising tension curve over a three act timeline, marking the inciting incident, lock-in, midpoint reversal, dark moment, climax and denouement",
      ar: "منحنى توتر صاعد على خط زمني من ثلاثة فصول، يحدد الحادثة المحرّكة ونقطة اللاعودة وانقلاب المنتصف واللحظة المظلمة والذروة والخاتمة",
    },
    Component: ThreeActCurve,
  },
  "heros-journey-circle": {
    aria: {
      en: "The hero's journey as a circle of eight stages flowing clockwise, split between the known world above and the unknown world below",
      ar: "رحلة البطل كدائرة من ثماني مراحل تدور باتجاه عقارب الساعة، مقسومة بين العالم المعروف في الأعلى والعالم المجهول في الأسفل",
    },
    Component: HerosJourneyCircle,
  },
  "beat-map": {
    aria: {
      en: "A manuscript bar with eight beats marked at their percentages, from the opening image at 1% to the final image at 100%",
      ar: "شريط المخطوطة وعليه ثماني نبضات محددة بنسبها المئوية، من الصورة الافتتاحية عند 1% إلى الصورة الختامية عند 100%",
    },
    Component: BeatMap,
  },
  "scene-value-shift": {
    aria: {
      en: "A scene box with goal, conflict and turn inside, entered on a minus charge and exited on a plus charge: the value shift",
      ar: "صندوق المشهد وبداخله الهدف والصراع والانقلاب، يدخله البطل بشحنة سالبة ويخرج بشحنة موجبة: انقلاب القيمة",
    },
    Component: SceneValueShift,
  },
  "wound-want-need": {
    aria: {
      en: "A triangle of wound, want and need: the wound causes the want, the want hides the need, and the story moves the character from want to need",
      ar: "مثلث الجرح والرغبة والحاجة: الجرح يسبب الرغبة، والرغبة تخفي الحاجة، والحكاية تنقل الشخصية من الرغبة إلى الحاجة",
    },
    Component: WoundWantNeed,
  },
  "pov-distances": {
    aria: {
      en: "A narrator camera and a character with three distance arcs: first person inside the head, third limited on the shoulder, omniscient above the world",
      ar: "كاميرا الراوي وشخصية بينهما ثلاثة أقواس للمسافة السردية: ضمير المتكلم داخل الرأس، والغائب المحدود على الكتف، والراوي العليم فوق العالم",
    },
    Component: PovDistances,
  },
  "tension-curve": {
    aria: {
      en: "Tension across chapters: a healthy rising sawtooth line contrasted with a flat dashed line that spikes late, the sagging middle",
      ar: "التوتر عبر الفصول: خط متعرّج صاعد وصحّي مقابل خط متقطع مسطّح يقفز متأخرًا، وهو الوسط المترهّل",
    },
    Component: TensionCurve,
  },
  "revision-funnel": {
    aria: {
      en: "A revision funnel of three passes narrowing downward: structural pass, scene pass, then line pass, ordered big to small",
      ar: "قمع المراجعة من ثلاث طبقات تضيق نزولًا: مرور بنيوي ثم مرور مشهدي ثم مرور جُملي، بالترتيب من الكبير إلى الصغير",
    },
    Component: RevisionFunnel,
  },
  "publishing-paths": {
    aria: {
      en: "A manuscript splitting into two paths: traditional publishing through query letter, literary agent, publisher and bookstore, and self publishing through edit and design, platform upload and reader",
      ar: "مخطوطة تتفرع إلى مسارين: النشر التقليدي عبر رسالة الاستعلام والوكيل الأدبي ودار النشر والمكتبة، والنشر الذاتي عبر التحرير والتصميم والرفع على المنصة والقارئ",
    },
    Component: PublishingPaths,
  },
  "premise-formula": {
    aria: {
      en: "A formula: character plus want plus obstacle plus stakes equals the premise, one sentence under pressure, with the promise noted beneath",
      ar: "معادلة: الشخصية زائد الرغبة زائد العقبة زائد الرهان تساوي الفرضية، جملة واحدة تحت الضغط، وتحتها الوعد",
    },
    Component: PremiseFormula,
  },
  "story-vs-plot": {
    aria: {
      en: "Two event pairs: joined by then, that is plot; joined by because of grief, that is story, with the causal arrow highlighted",
      ar: "زوجان من الأحداث: يربطهما ثم فتلك الحبكة، ويربطهما سبب الحزن فتلك الحكاية، مع إبراز سهم السببية",
    },
    Component: StoryVsPlot,
  },
  "show-dont-tell-iceberg": {
    aria: {
      en: "An iceberg: the small visible tip is what you write, the large mass under water is what the reader feels, and the reader dives",
      ar: "جبل جليد: القمة الصغيرة الظاهرة هي ما تكتبه، والكتلة الكبيرة تحت الماء هي ما يشعر به القارئ، والقارئ يغوص",
    },
    Component: ShowDontTellIceberg,
  },
};

export function CourseDiagram({
  name,
  caption,
}: {
  name: string;
  caption?: string;
}): JSX.Element | null {
  const { isRTL } = useLanguage();
  const entry: DiagramEntry | undefined = DIAGRAMS[name];
  if (!entry) return null;
  const { Component } = entry;
  return (
    <Diagram ariaLabel={isRTL ? entry.aria.ar : entry.aria.en} caption={caption}>
      <Component />
    </Diagram>
  );
}
