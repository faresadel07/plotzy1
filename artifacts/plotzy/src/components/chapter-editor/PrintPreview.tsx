import { useRef } from "react";
import { BookOpen, Printer, ChevronLeft, ChevronRight, X } from "lucide-react";

const PAPER_SIZES: Record<string, { width: number; height: number; widthCm: number; heightCm: number; label: string; labelAr: string; icon: string }> = {
  "a5":     { width: 559,  height: 794,  widthCm: 14.8, heightCm: 21.0, label: "Classic Novel",       labelAr: "رواية كلاسيكية",  icon: "📖" },
  "pocket": { width: 416,  height: 680,  widthCm: 11.0, heightCm: 18.0, label: "Pocket Book",         labelAr: "كتاب جيب",        icon: "✋" },
  "trade":  { width: 576,  height: 864,  widthCm: 15.2, heightCm: 22.9, label: "Professional Trade",  labelAr: "تجاري احترافي",   icon: "📚" },
  "a4":     { width: 794,  height: 1123, widthCm: 21.0, heightCm: 29.7, label: "Standard A4",         labelAr: "A4 قياسي",        icon: "📄" },
};

interface PrintPreviewProps {
  printPages: string[];
  currentSpread: number;
  setCurrentSpread: React.Dispatch<React.SetStateAction<number>>;
  maxSpread: number;
  fontStyle: React.CSSProperties;
  prefs: { textColor?: string; paperSize?: string; pageTheme?: string; bgColor?: string; [key: string]: any };
  resolvedBgColor: string | undefined;
  title: string;
  bookTitle: string;
  authorName: string;
  ar: boolean;
  onClose: () => void;
  renderPageContent: (html: string, isFirstPage: boolean) => React.ReactNode;
}

export function PrintPreview({
  printPages,
  currentSpread,
  setCurrentSpread,
  maxSpread,
  fontStyle,
  prefs,
  resolvedBgColor,
  title,
  bookTitle,
  authorName,
  ar,
  onClose,
  renderPageContent,
}: PrintPreviewProps) {
  const printScrollRef = useRef<HTMLDivElement>(null);

  const totalWords = printPages.join(" ").split(/\s+/).filter(Boolean).length;
  const readMins = Math.max(1, Math.round(totalWords / 200));
  const progressPct = maxSpread > 0 ? (currentSpread / maxSpread) * 100 : 100;
  const pageFont = fontStyle.fontFamily || "Georgia, 'Times New Roman', serif";
  const pageColor = prefs.textColor || '#111111';
  const pageBg = resolvedBgColor || '#FFFEF8';

  const ps = PAPER_SIZES[prefs.paperSize || "trade"];
  const MAX_SPREAD_W = Math.min(window.innerWidth - 48, 1200);
  const spreadRawW = ps.width * 2 + 6;
  const pvScaleW = Math.min(1, MAX_SPREAD_W / spreadRawW);
  // Also constrain by height so spread fits without scrolling
  // Available height = viewport - topbar(56) - progressbar(2) - paddingV(64) - nav(96)
  const MAX_SPREAD_H = Math.max(280, window.innerHeight - 56 - 2 - 64 - 96);
  const pvScaleH = Math.min(1, MAX_SPREAD_H / ps.height);
  const pvScale = Math.min(pvScaleW, pvScaleH);
  const pvPageW = Math.round(ps.width * pvScale);
  const pvPageH = Math.round(ps.height * pvScale);
  const pvFontSz = Math.round(14 * pvScale);
  const pvLineh = '1.72';

  return (
    <div className="fixed inset-0 z-[200] flex flex-col select-none" style={{ background: '#0d0d0f' }}>
    <style>{`
      .pv-page p, .pv-page-first p { margin: 0 0 0.75em 0; line-height: ${pvLineh}; }
      .pv-page p + p { text-indent: 1.5em; }
      .pv-page-first p:first-child::first-letter {
        float: left; font-size: 4.5em; line-height: 0.72;
        padding-right: 0.08em; padding-top: 0.06em;
        font-weight: 700; color: ${pageColor};
      }
      .pv-page strong, .pv-page-first strong { font-weight: 700; }
      .pv-page em, .pv-page-first em { font-style: italic; }
      .pv-page u, .pv-page-first u { text-decoration: underline; }
      .pv-page h1, .pv-page-first h1 { font-size: 1.4em; font-weight: 700; margin: 0.5em 0 0.8em; }
      .pv-page h2, .pv-page-first h2 { font-size: 1.2em; font-weight: 700; margin: 0.5em 0 0.6em; }
      .pv-page h3, .pv-page-first h3 { font-size: 1.05em; font-weight: 600; margin: 0.4em 0 0.5em; }
      .pv-page [style*="text-align: center"], .pv-page-first [style*="text-align: center"] { text-align: center; }
      .pv-page [style*="text-align: right"], .pv-page-first [style*="text-align: right"] { text-align: right; }
      .pv-page [style*="text-align: justify"], .pv-page-first [style*="text-align: justify"] { text-align: justify; }
    `}</style>

      {/* Top Bar */}
      <div style={{ height: '56px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', flexShrink: 0 }}>
        {/* Left: book info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BookOpen style={{ width: '15px', height: '15px', color: 'rgba(255,255,255,0.22)', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: pageFont, fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', lineHeight: 1.2 }}>
              {bookTitle || (ar ? 'كتاب بلا عنوان' : 'Untitled Book')}
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)', marginTop: '1px' }}>
              {title} {authorName ? `· ${authorName}` : ''}
            </span>
          </div>
        </div>

        {/* Center: reading stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.20)', fontFamily: 'system-ui' }}>
            {totalWords.toLocaleString()} {ar ? 'كلمة' : 'words'}
            {'  ·  '}
            ~{readMins} {ar ? 'د قراءة' : 'min read'}
          </span>
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', fontSize: '11px', letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >
            <Printer style={{ width: '12px', height: '12px' }} />
            {ar ? 'طباعة' : 'Print'}
          </button>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.07)' }} />
          <button
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.30)', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.30)'; }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>

      {/* Reading Progress Bar */}
      <div style={{ height: '2px', background: 'rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))', width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* Scrollable Book Area */}
      <div ref={printScrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1.5rem' }}>

        {printPages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'rgba(255,255,255,0.20)', fontFamily: pageFont, fontStyle: 'italic' }}>
            <BookOpen style={{ width: '40px', height: '40px', opacity: 0.2 }} />
            <p style={{ fontSize: '16px' }}>{ar ? 'لا يوجد محتوى بعد. ابدأ الكتابة!' : 'No content yet. Start writing!'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>

            {/* Two-Page Spread */}
            <div style={{
              display: 'flex',
              width: pvPageW * 2 + 6,
              height: pvPageH,
              flexShrink: 0,
              boxShadow: '0 48px 120px rgba(0,0,0,0.85), 0 16px 40px rgba(0,0,0,0.55)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>

              {/* Left Page */}
              <div style={{ width: pvPageW, height: pvPageH, flexShrink: 0, position: 'relative', display: 'flex', flexDirection: 'column', background: pageBg, padding: `${Math.round(pvPageH * 0.075)}px ${Math.round(pvPageW * 0.09)}px ${Math.round(pvPageH * 0.07)}px ${Math.round(pvPageW * 0.10)}px`, boxShadow: 'inset -18px 0 36px rgba(0,0,0,0.10), inset -2px 0 8px rgba(0,0,0,0.06)', boxSizing: 'border-box' }}>
                {/* Running header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(0,0,0,0.10)', paddingBottom: `${Math.round(5 * pvScale)}px`, marginBottom: `${Math.round(pvPageH * 0.055)}px`, flexShrink: 0 }}>
                  <span style={{ fontSize: `${Math.round(7 * pvScale)}px`, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.20)', fontFamily: 'system-ui' }}>
                    {bookTitle || ''}
                  </span>
                  <span style={{ fontSize: `${Math.round(7 * pvScale)}px`, color: 'rgba(0,0,0,0.15)', fontFamily: 'system-ui' }}>&#10087;</span>
                </div>

                {/* Content */}
                <div style={{ fontFamily: pageFont, fontSize: `${pvFontSz}px`, color: pageColor, flex: 1, overflow: 'hidden' }}>
                  {printPages[currentSpread * 2] !== undefined
                    ? renderPageContent(printPages[currentSpread * 2], currentSpread === 0)
                    : null}
                </div>

                {/* Footer: page number */}
                <div style={{ flexShrink: 0, marginTop: `${Math.round(pvPageH * 0.025)}px`, borderTop: '0.5px solid rgba(0,0,0,0.08)', paddingTop: `${Math.round(5 * pvScale)}px`, display: 'flex', justifyContent: 'center' }}>
                  <span style={{ fontSize: `${Math.round(9 * pvScale)}px`, color: 'rgba(0,0,0,0.22)', fontFamily: pageFont, letterSpacing: '0.15em' }}>
                    — {currentSpread * 2 + 1} —
                  </span>
                </div>
              </div>

              {/* Binding */}
              <div style={{
                width: '6px',
                height: pvPageH,
                flexShrink: 0,
                background: 'linear-gradient(to right, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.05) 70%, rgba(0,0,0,0.14) 100%)',
                boxShadow: 'inset 2px 0 8px rgba(0,0,0,0.18), inset -2px 0 8px rgba(0,0,0,0.10)',
              }} />

              {/* Right Page */}
              {printPages[currentSpread * 2 + 1] !== undefined ? (
                <div style={{ width: pvPageW, height: pvPageH, flexShrink: 0, position: 'relative', display: 'flex', flexDirection: 'column', background: pageBg, padding: `${Math.round(pvPageH * 0.075)}px ${Math.round(pvPageW * 0.10)}px ${Math.round(pvPageH * 0.07)}px ${Math.round(pvPageW * 0.09)}px`, boxShadow: 'inset 18px 0 36px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
                  {/* Running header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(0,0,0,0.10)', paddingBottom: `${Math.round(5 * pvScale)}px`, marginBottom: `${Math.round(pvPageH * 0.055)}px`, flexShrink: 0 }}>
                    <span style={{ fontSize: `${Math.round(7 * pvScale)}px`, color: 'rgba(0,0,0,0.15)', fontFamily: 'system-ui' }}>&#10087;</span>
                    <span style={{ fontSize: `${Math.round(7 * pvScale)}px`, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.20)', fontFamily: 'system-ui' }}>
                      {title || (ar ? 'فصل' : 'Chapter')}
                    </span>
                  </div>

                  {/* Content */}
                  <div style={{ fontFamily: pageFont, fontSize: `${pvFontSz}px`, color: pageColor, flex: 1, overflow: 'hidden' }}>
                    {renderPageContent(printPages[currentSpread * 2 + 1], false)}
                  </div>

                  {/* Footer */}
                  <div style={{ flexShrink: 0, marginTop: `${Math.round(pvPageH * 0.025)}px`, borderTop: '0.5px solid rgba(0,0,0,0.08)', paddingTop: `${Math.round(5 * pvScale)}px`, display: 'flex', justifyContent: 'center' }}>
                    <span style={{ fontSize: `${Math.round(9 * pvScale)}px`, color: 'rgba(0,0,0,0.22)', fontFamily: pageFont, letterSpacing: '0.15em' }}>
                      — {currentSpread * 2 + 2} —
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ width: pvPageW, height: pvPageH, flexShrink: 0, background: pageBg, boxShadow: 'inset 18px 0 36px rgba(0,0,0,0.03)', opacity: 0.6, boxSizing: 'border-box' }} />
              )}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setCurrentSpread(s => Math.max(0, s - 1))}
                disabled={currentSpread === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '100px', border: `1px solid ${currentSpread === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.14)'}`, background: 'transparent', color: currentSpread === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)', fontSize: '11px', cursor: currentSpread === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.2s', letterSpacing: '0.03em' }}
              >
                <ChevronLeft style={{ width: '12px', height: '12px' }} />
                {ar ? 'السابق' : 'Prev'}
              </button>

              {/* Spread dots */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {Array.from({ length: maxSpread + 1 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSpread(i)}
                    style={{ width: i === currentSpread ? '16px' : '5px', height: '5px', borderRadius: '100px', background: i === currentSpread ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer', transition: 'all 0.25s ease', padding: 0 }}
                  />
                ))}
              </div>

              <button
                onClick={() => setCurrentSpread(s => Math.min(maxSpread, s + 1))}
                disabled={currentSpread >= maxSpread}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '100px', border: `1px solid ${currentSpread >= maxSpread ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.14)'}`, background: 'transparent', color: currentSpread >= maxSpread ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)', fontSize: '11px', cursor: currentSpread >= maxSpread ? 'not-allowed' : 'pointer', transition: 'all 0.2s', letterSpacing: '0.03em' }}
              >
                {ar ? 'التالي' : 'Next'}
                <ChevronRight style={{ width: '12px', height: '12px' }} />
              </button>

              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.12)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'system-ui', marginLeft: '4px' }}>
                {ar ? '← →  ·  Esc' : '← →  ·  Esc'}
              </span>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
