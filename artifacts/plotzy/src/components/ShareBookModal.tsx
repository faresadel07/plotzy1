// A polished sharing panel for a published book.
//
// Design goals:
//   - Every mainstream social platform in one click (WhatsApp, X,
//     Facebook, LinkedIn, Telegram, plus native OS share sheet on
//     supported browsers).
//   - Instant "Copy link" with a satisfying success state so writers
//     can paste into an Instagram bio in two clicks total.
//   - QR code generated client-side (no third-party image API, so
//     the link never leaks) as a proper SVG the writer can save,
//     print, or export as PNG.
//   - Preview panel showing exactly how the shared card will look
//     on WhatsApp / X — cover image, title, author, host — so the
//     writer isn't sharing blind.
//
// This component is completely self-contained. Consumers just pass
// `bookId`, `title`, `author`, `coverImage`, and an `open`/`onClose`
// pair. No global state, no server calls.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import {
  Copy, Check, X, Download, Share2, MessageCircle, QrCode,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";

interface ShareBookModalProps {
  open: boolean;
  onClose: () => void;
  bookId: number | string;
  title: string;
  author: string | null;
  coverImage?: string | null;
  summary?: string | null;
}

// The public reader lives at plotzy.co/read/:id — kept as a helper so
// we build the shareable URL exactly one way and don't drift.
function buildPublicUrl(bookId: number | string): string {
  const origin = typeof window !== "undefined"
    ? window.location.origin
    : "https://plotzy.co";
  return `${origin}/read/${bookId}`;
}

export function ShareBookModal({ open, onClose, bookId, title, author, coverImage, summary }: ShareBookModalProps) {
  const { lang, isRTL } = useLanguage();
  const ar = lang === "ar";
  const { toast } = useToast();
  const publicUrl = useMemo(() => buildPublicUrl(bookId), [bookId]);
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [showQr, setShowQr] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement | null>(null);

  // Regenerate QR whenever the URL changes or the panel opens. We
  // strip the width/height attributes from the SVG and rely on CSS
  // to size it — the library emits fixed pixel dims which overflow
  // any container smaller than the requested width. `preserveAspectRatio`
  // + viewBox keeps the QR crisp at any target size.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await QRCode.toString(publicUrl, {
          type: "svg",
          errorCorrectionLevel: "M",
          margin: 1,
          color: { dark: "#0a0a0a", light: "#ffffff" },
        });
        // Strip hard-coded dimensions so the SVG scales to its parent
        // instead of asserting a fixed pixel size.
        const responsive = raw
          .replace(/\swidth="[^"]*"/, "")
          .replace(/\sheight="[^"]*"/, "")
          .replace("<svg", '<svg style="display:block;width:100%;height:100%" preserveAspectRatio="xMidYMid meet"');
        if (!cancelled) setQrSvg(responsive);
      } catch {
        if (!cancelled) setQrSvg("");
      }
    })();
    return () => { cancelled = true; };
  }, [publicUrl, open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const shareText = ar
    ? `اقرأ "${title}"${author ? ` — بقلم ${author}` : ""} على Plotzy`
    : `Read "${title}"${author ? ` by ${author}` : ""} on Plotzy`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast({
        title: ar ? "تم النسخ" : "Link copied",
        description: ar
          ? "الصق الرابط في بايو انستغرام أو أي مكان."
          : "Paste it in your Instagram bio or anywhere.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: ar ? "تعذّر النسخ" : "Could not copy",
        variant: "destructive",
      });
    }
  };

  const nativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    try {
      await navigator.share({
        title,
        text: shareText,
        url: publicUrl,
      });
    } catch (err: any) {
      // AbortError = user dismissed the sheet; ignore.
      if (err?.name === "AbortError") return;
    }
  };

  const downloadQrPng = async () => {
    if (!qrContainerRef.current) return;
    const svg = qrContainerRef.current.querySelector("svg");
    if (!svg) return;
    // Clone the SVG and set explicit width/height so <img> renders it
    // at a real size — the on-screen SVG is CSS-sized to 100%/100%,
    // which many browsers interpret as 300x150 when loaded via a data
    // URL, producing a distorted PNG.
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("width", "1024");
    clone.setAttribute("height", "1024");
    // Strip the inline style we injected for on-screen sizing.
    clone.removeAttribute("style");
    const serialized = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const dlUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement("a");
        a.href = dlUrl;
        a.download = `plotzy-${bookId}-qr.png`;
        a.click();
        URL.revokeObjectURL(dlUrl);
      }, "image/png");
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  // Building block for one social platform tile.
  const shareLinks = [
    {
      name: "WhatsApp",
      icon: <WhatsAppGlyph />,
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${publicUrl}`)}`,
      tint: "#25D366",
    },
    {
      name: "X",
      icon: <XGlyph />,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(publicUrl)}`,
      tint: "#000000",
    },
    {
      name: "Facebook",
      icon: <FacebookGlyph />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`,
      tint: "#1877F2",
    },
    {
      name: "Telegram",
      icon: <TelegramGlyph />,
      href: `https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(shareText)}`,
      tint: "#26A5E4",
    },
    {
      name: "LinkedIn",
      icon: <LinkedInGlyph />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`,
      tint: "#0A66C2",
    },
    {
      name: "Email",
      icon: <EmailGlyph />,
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText}\n\n${publicUrl}`)}`,
      tint: "#EA4335",
    },
  ];

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      dir={isRTL ? "rtl" : "ltr"}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 560, maxHeight: "88vh", overflow: "auto",
          background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20, color: "#f0efe8",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>
              {ar ? "شارك كتابك" : "Share your book"}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</div>
          </div>
          <button
            onClick={onClose}
            aria-label={ar ? "إغلاق" : "Close"}
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#f0efe8", cursor: "pointer", display: "grid", placeItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Preview card — how the link will appear when pasted in
            WhatsApp / X / Discord etc. Cover + title + author + host. */}
        <div style={{ padding: "22px" }}>
          <div style={{
            display: "flex", gap: 14, alignItems: "center",
            padding: "14px", borderRadius: 14,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{
              width: 74, height: 100, borderRadius: 6, flexShrink: 0,
              background: coverImage ? "#000" : "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
              overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
            }}>
              {coverImage && (
                <img src={coverImage} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 4 }}>
                plotzy.co
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.35, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {title}
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {author ? (ar ? `بقلم ${author}` : `by ${author}`) : (ar ? "مؤلّف مجهول" : "Anonymous")}
              </div>
              {summary && (
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", marginTop: 6, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {summary}
                </div>
              )}
            </div>
          </div>

          {/* URL + copy row */}
          <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
            <div style={{
              flex: 1, minWidth: 0, padding: "10px 14px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12.5,
              color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", direction: "ltr",
            }}>
              {publicUrl}
            </div>
            <button
              onClick={handleCopy}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 16px", borderRadius: 12,
                background: copied ? "rgba(80,220,120,0.14)" : "#f0efe8",
                color: copied ? "#7cd9a8" : "#0a0a0a",
                border: copied ? "1px solid rgba(80,220,120,0.4)" : "1px solid #f0efe8",
                fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                transition: "all 160ms ease", whiteSpace: "nowrap",
                fontFamily: "inherit",
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? (ar ? "تم النسخ" : "Copied") : (ar ? "نسخ الرابط" : "Copy link")}
            </button>
          </div>

          {/* Native share (mobile Web Share API) */}
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              onClick={nativeShare}
              style={{
                marginTop: 10, width: "100%", padding: "10px 14px",
                borderRadius: 12, background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#f0efe8", fontSize: 12.5, fontWeight: 700,
                cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontFamily: "inherit",
              }}
            >
              <Share2 size={14} />
              {ar ? "شارك عبر تطبيقات الجهاز..." : "Share via device apps..."}
            </button>
          )}

          {/* Social grid */}
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
              {ar ? "أرسل مباشرة" : "Send directly"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
              {shareLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    padding: "14px 8px", borderRadius: 14,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "#f0efe8", textDecoration: "none",
                    transition: "all 160ms ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.14)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: s.tint, display: "grid", placeItems: "center",
                    color: s.name === "X" ? "#fff" : "#fff",
                  }}>
                    {s.icon}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Instagram helper — Instagram doesn't accept URL params for
              stories, so we point the writer at the two-tap flow. */}
          <div style={{
            marginTop: 16, padding: "12px 14px", borderRadius: 12,
            background: "rgba(225,48,108,0.08)", border: "1px solid rgba(225,48,108,0.28)",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg,#f58529,#dd2a7b,#8134af,#515bd4)",
              display: "grid", placeItems: "center",
            }}>
              <InstagramGlyph />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Instagram</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.45 }}>
                {ar
                  ? "انسخ الرابط والصقه في البايو أو ستوري."
                  : "Copy the link and paste it in your bio or story."}
              </div>
            </div>
            <button
              onClick={handleCopy}
              style={{
                padding: "7px 12px", borderRadius: 10,
                background: "rgba(255,255,255,0.08)", color: "#f0efe8",
                border: "1px solid rgba(255,255,255,0.14)",
                fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {ar ? "نسخ" : "Copy"}
            </button>
          </div>

          {/* QR code panel — collapsible so it doesn't dominate the modal */}
          <div style={{ marginTop: 22 }}>
            <button
              onClick={() => setShowQr((v) => !v)}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 12,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#f0efe8", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontFamily: "inherit",
              }}
            >
              <QrCode size={14} />
              {showQr
                ? (ar ? "إخفاء رمز QR" : "Hide QR code")
                : (ar ? "أظهر رمز QR" : "Show QR code")}
            </button>
            {showQr && qrSvg && (
              <div style={{
                marginTop: 12, padding: 20, borderRadius: 14,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", flexDirection: "column", alignItems: "center",
              }}>
                {/* QR sits in its own white matte with generous padding
                    so the finder patterns aren't cut off. The inner
                    SVG stretches to fill via the responsive style we
                    injected in the generator effect. */}
                <div
                  ref={qrContainerRef}
                  style={{
                    width: 220, height: 220, padding: 14, borderRadius: 12,
                    background: "#ffffff", boxSizing: "border-box",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
                    display: "block",
                  }}
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", textAlign: "center", maxWidth: 320, lineHeight: 1.5, marginTop: 18 }}>
                  {ar
                    ? "اطبعه على بطاقتك أو بروموشن كتابك — أي كاميرا هاتف تفتح الرابط."
                    : "Print it on a card or a promo. Any phone camera opens the link."}
                </div>
                <button
                  onClick={downloadQrPng}
                  style={{
                    marginTop: 14,
                    padding: "9px 14px", borderRadius: 10,
                    background: "#f0efe8", color: "#0a0a0a",
                    border: "1px solid #f0efe8", fontSize: 12.5, fontWeight: 700,
                    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                    fontFamily: "inherit",
                  }}
                >
                  <Download size={13} />
                  {ar ? "نزّل رمز QR" : "Download QR"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render into a portal so the fixed overlay isn't caught by any
  // parent's transform/overflow context.
  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

// ─── Brand glyphs (inline SVG so we don't ship a whole icon set) ───

function WhatsAppGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}
function XGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function FacebookGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
function TelegramGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}
function LinkedInGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
function EmailGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 6 10 7 10-7" />
    </svg>
  );
}
function InstagramGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none" />
    </svg>
  );
}

// The MessageCircle import prevents the icon set tree-shaker from
// dropping the file; also keeps the codebase importing a real lucide
// module even after we swap to inline SVGs. Silences noUnusedLocals.
void MessageCircle;

export default ShareBookModal;
