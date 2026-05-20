// Static visual preview of the AI chat panel. Lives outside the auth
// gate so the design can be reviewed while login is unavailable (the
// DB is currently over its monthly transfer cap and the panel itself
// would otherwise be unreachable). The messages here are hard-coded
// samples — nothing talks to the live API on this page.

import { AiChatPanel } from "@/components/AiChatPanel";
import { useLanguage } from "@/contexts/language-context";

const APPLE_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

export default function AiChatPreview() {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";

  const samples = ar
    ? [
        { role: "user" as const, content: "اقترح لي ثلاث طرق لتطوير شخصية البطل في الفصل الأول." },
        {
          role: "assistant" as const,
          content:
            "ثلاث زوايا مختلفه:\n\n1. ابدأ بمشهد فشل صغير يكشف ضعفه قبل قوّته، فالقارئ يتعاطف معه قبل ما يحبّه.\n\n2. اعطه عاده يوميه غريبه يكرّرها (نوع قهوه معيّن، طريقه ربط حذائه)، وكسر العاده لاحقاً يصير علامه على تحوّله الداخلي.\n\n3. ضع بجانبه شخصيه ثانويه تعرف سرّه، بحيث الحوار بينهما يكشف للقارئ ما لا يستطيع البطل قوله صراحه.",
        },
        { role: "user" as const, content: "كويس. اعطيني افتتاحيه قويه للفصل الثاني." },
        {
          role: "assistant" as const,
          content:
            "جرّب الافتتاح من منتصف الحدث، بدون تمهيد. مثلاً:\n\n\"كانت يداه ترتعشان وهو يحمل المظروف. لم يقرأه بعد، لكنه عرف ما بداخله.\"\n\nهيك بتفتح فضول القارئ على سؤالين دفعه وحده: شو في المظروف، وكيف عرف؟",
        },
      ]
    : [
        { role: "user" as const, content: "Give me three ways to develop my protagonist in chapter one." },
        {
          role: "assistant" as const,
          content:
            "Three different angles:\n\n1. Open on a small failure that reveals his weakness before his strength. The reader will care for him before they admire him.\n\n2. Give him an oddly specific daily habit (a particular coffee, the way he ties his shoes), then break it later — that break becomes the visible marker of his inner change.\n\n3. Place a secondary character beside him who already knows his secret. Their dialogue can reveal to the reader what the protagonist cannot say aloud.",
        },
        { role: "user" as const, content: "Nice. Now give me a strong opening for chapter two." },
        {
          role: "assistant" as const,
          content:
            "Try opening mid-scene, no setup. For instance:\n\n\"His hands were shaking as he held the envelope. He had not read it yet, but he already knew what was inside.\"\n\nThat opens two questions at once: what is inside, and how does he know?",
        },
      ];

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        minHeight: "100vh",
        background: "#0b0b0c",
        color: "rgba(255,255,255,0.92)",
        fontFamily: APPLE_FONT,
        padding: "60px 24px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      <div style={{ maxWidth: 720, width: "100%" }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.45)",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {ar ? "معاينة التصميم فقط" : "Design preview only"}
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}
        >
          {ar ? "مساعد الكتابة الذكي" : "AI Writing Assistant"}
        </h1>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.65)",
            maxWidth: 560,
          }}
        >
          {ar
            ? "هذه الصفحة لمعاينة شكل المحادثة فقط. الرسائل على الجانب نماذج ثابتة لا تتصل بالذكاء الاصطناعي. اللوحة هي بالضبط ما سيظهر للكاتب داخل صفحة تحرير الفصل."
            : "This page is only for previewing the look of the chat. The messages on the side are static samples that do not talk to the live AI. The side panel is exactly what a writer sees inside the chapter editor."}
        </p>
      </div>

      <AiChatPanel
        open
        onClose={() => {
          /* no-op on preview */
        }}
        initialMessages={samples}
      />
    </div>
  );
}
