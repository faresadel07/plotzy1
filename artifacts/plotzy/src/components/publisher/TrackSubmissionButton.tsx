// "Track Submission" CTA + status badge.
//
// Lives on every publisher card and every literary-agent card in the
// directory. Two states:
//
//   - Not yet submitted: shows a Track button that opens an inline
//     dialog (date + status + notes). Saves a draft submission row
//     for this (book, recipient) pair so the writer doesn't lose it.
//
//   - Already tracked: shows the current status badge inline instead
//     of the button, and a small "View" affordance to jump to the My
//     Submissions tab.
//
// recipientKey shape is "pub:<id>" for publishers and
// "agent:<id>" for agents — this is the same scheme the back-end
// uses to namespace bookmarks and submissions.

import { useMemo, useState } from "react";
import { Send, Check, Bookmark, BookmarkCheck } from "lucide-react";
import {
  useSubmissions, useCreateSubmission,
  useSavedPublishers, useSavePublisher, useUnsavePublisher,
  statusLabel, statusColors,
  type SubmissionStatus,
} from "@/hooks/use-submissions";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';
const CARD = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.10)";
const BORDER_STRONG = "rgba(255,255,255,0.18)";
const TEXT = "#f0efe8";
const MUTED = "rgba(255,255,255,0.55)";

interface Props {
  bookId: number | undefined;
  recipientKey: string;
  recipientName: string;
  ar: boolean;
  compact?: boolean;
}

export function TrackSubmissionButton({ bookId, recipientKey, recipientName, ar, compact }: Props) {
  const { data: subs = [] } = useSubmissions(bookId);
  const create = useCreateSubmission();
  const [open, setOpen] = useState(false);

  // Find the most recent submission for this (book, recipient) so the
  // button can switch into "view status" mode once tracked.
  const existing = useMemo(() => {
    return subs
      .filter((s) => s.recipientKey === recipientKey)
      .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))[0];
  }, [subs, recipientKey]);

  if (!bookId) {
    return (
      <button
        disabled
        title={ar ? "اختر كتاباً أوّلاً" : "Open this page from a book to track submissions"}
        style={btnStyle(compact, true)}
      >
        <Send size={compact ? 11 : 13} />
        {ar ? "تتبّع" : "Track"}
      </button>
    );
  }

  if (existing) {
    const c = statusColors(existing.status);
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: compact ? "4px 9px" : "6px 11px",
          borderRadius: 999,
          background: c.bg,
          border: `1px solid ${c.border}`,
          color: c.fg,
          fontFamily: SF,
          fontSize: compact ? 11 : 12,
          fontWeight: 700,
        }}
        title={ar ? "تابع في تبويب «تقديماتي»" : "Open the My Submissions tab to edit"}
      >
        <Check size={compact ? 10 : 12} />
        {statusLabel(existing.status, ar)}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={btnStyle(compact, false)}
      >
        <Send size={compact ? 11 : 13} />
        {ar ? "تتبّع التقديم" : "Track Submission"}
      </button>
      {open && (
        <TrackDialog
          ar={ar}
          recipientName={recipientName}
          onCancel={() => setOpen(false)}
          onConfirm={(status, submittedAt, notes) => {
            create.mutate(
              {
                bookId,
                recipientKey,
                recipientName,
                status,
                submittedAt: submittedAt || null,
                notes: notes || null,
              },
              { onSuccess: () => setOpen(false) },
            );
          }}
          pending={create.isPending}
        />
      )}
    </>
  );
}

// ── Save-publisher heart-style toggle ─────────────────────────────

export function SavePublisherButton({ recipientKey, ar, compact }: { recipientKey: string; ar: boolean; compact?: boolean }) {
  const { data: saved = [] } = useSavedPublishers();
  const save = useSavePublisher();
  const unsave = useUnsavePublisher();
  const isSaved = saved.some((s) => s.recipientKey === recipientKey);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (isSaved) unsave.mutate(recipientKey);
        else save.mutate({ recipientKey });
      }}
      title={isSaved ? (ar ? "إزالة من المحفوظات" : "Remove from saved") : ar ? "احفظ للمراجعة" : "Save for later"}
      aria-label={isSaved ? "Unsave" : "Save"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: compact ? 26 : 30,
        height: compact ? 26 : 30,
        borderRadius: 8,
        background: isSaved ? "rgba(251,191,36,0.12)" : CARD,
        border: `1px solid ${isSaved ? "rgba(251,191,36,0.30)" : BORDER}`,
        color: isSaved ? "#fcd34d" : MUTED,
        cursor: "pointer",
        transition: "all 120ms",
      }}
    >
      {isSaved ? <BookmarkCheck size={compact ? 12 : 14} /> : <Bookmark size={compact ? 12 : 14} />}
    </button>
  );
}

// ── Track dialog ──────────────────────────────────────────────────

function TrackDialog({
  ar, recipientName, onCancel, onConfirm, pending,
}: {
  ar: boolean;
  recipientName: string;
  onCancel: () => void;
  onConfirm: (status: SubmissionStatus, submittedAt: string, notes: string) => void;
  pending: boolean;
}) {
  const [status, setStatus] = useState<SubmissionStatus>("submitted");
  const today = new Date().toISOString().slice(0, 10);
  const [submittedAt, setSubmittedAt] = useState<string>(today);
  const [notes, setNotes] = useState<string>("");

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: SF,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        dir={ar ? "rtl" : "ltr"}
        style={{
          background: "#1a1a1c",
          color: TEXT,
          border: `1px solid ${BORDER_STRONG}`,
          borderRadius: 18,
          padding: 22,
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.015em", marginBottom: 4 }}>
          {ar ? "تتبّع تقديمك" : "Track your submission"}
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 18 }}>
          {recipientName}
        </div>

        {/* Status select */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {ar ? "الحالة" : "Status"}
          </label>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {(["draft", "submitted"] as SubmissionStatus[]).map((st) => {
              const active = status === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatus(st)}
                  style={{
                    fontFamily: SF,
                    padding: "7px 14px",
                    borderRadius: 999,
                    background: active ? TEXT : "rgba(255,255,255,0.06)",
                    color: active ? "#000" : MUTED,
                    border: `1px solid ${active ? TEXT : BORDER}`,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {st === "draft" ? (ar ? "حفظ كمسوّدة" : "Save as draft") : (ar ? "بَعَثت اليوم" : "Sent it")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submitted at */}
        {status === "submitted" && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {ar ? "تاريخ الإرسال" : "Submitted on"}
            </label>
            <input
              type="date"
              value={submittedAt}
              max={today}
              onChange={(e) => setSubmittedAt(e.target.value)}
              style={{
                fontFamily: SF,
                width: "100%",
                marginTop: 8,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${BORDER}`,
                color: TEXT,
                fontSize: 13,
                outline: "none",
                colorScheme: "dark",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {ar ? "ملاحظات (اختيارية)" : "Notes (optional)"}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={ar ? "أي شيء تريد تذكّره عن هذا التقديم" : "Anything you want to remember about this submission"}
            style={{
              fontFamily: SF,
              width: "100%",
              marginTop: 8,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${BORDER}`,
              color: TEXT,
              fontSize: 13,
              lineHeight: 1.55,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={pending}
            style={{
              fontFamily: SF,
              padding: "9px 18px",
              borderRadius: 10,
              background: "transparent",
              border: `1px solid ${BORDER}`,
              color: MUTED,
              fontSize: 13,
              fontWeight: 600,
              cursor: pending ? "default" : "pointer",
              opacity: pending ? 0.5 : 1,
            }}
          >
            {ar ? "إلغاء" : "Cancel"}
          </button>
          <button
            onClick={() => onConfirm(status, submittedAt, notes)}
            disabled={pending}
            style={{
              fontFamily: SF,
              padding: "9px 22px",
              borderRadius: 10,
              background: TEXT,
              border: `1px solid ${TEXT}`,
              color: "#000",
              fontSize: 13,
              fontWeight: 700,
              cursor: pending ? "default" : "pointer",
              opacity: pending ? 0.5 : 1,
            }}
          >
            {pending ? (ar ? "..." : "...") : ar ? "احفظ" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(compact: boolean | undefined, disabled: boolean): React.CSSProperties {
  return {
    fontFamily: SF,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: compact ? "5px 10px" : "7px 12px",
    borderRadius: 999,
    background: CARD,
    border: `1px solid ${BORDER}`,
    color: disabled ? "rgba(255,255,255,0.30)" : MUTED,
    fontSize: compact ? 11 : 12.5,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 120ms",
    opacity: disabled ? 0.6 : 1,
  };
}
