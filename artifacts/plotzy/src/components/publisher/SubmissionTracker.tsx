// "My Submissions" dashboard for the Find Publishers page.
//
// Reads every submission the writer has logged across all of their
// books, surfaces the headline counters at the top (Pending /
// Rejected / Accepted / median response time), and renders an editable
// table with one row per submission. Each row can be:
//   - marked as submitted / rejected / accepted
//   - given a follow-up reminder date
//   - annotated with rejection notes (form letter vs personalised)
//   - deleted
//
// Filtering: status chips at the top let the writer narrow the table
// to one status at a time. The default view is "All" so the writer
// sees the full pipeline.

import { useMemo, useState } from "react";
import {
  Send, Clock, X, Check, Inbox, AlertTriangle, Sparkles,
  ExternalLink, Trash2, Pencil, ChevronDown,
} from "lucide-react";
import {
  useSubmissions, useSubmissionStats, useUpdateSubmission, useDeleteSubmission,
  statusLabel, statusColors, daysBetween,
  type Submission, type SubmissionStatus,
} from "@/hooks/use-submissions";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';
const CARD = "rgba(255,255,255,0.04)";
const CARD_HOVER = "rgba(255,255,255,0.07)";
const BORDER = "rgba(255,255,255,0.09)";
const BORDER_STRONG = "rgba(255,255,255,0.16)";
const TEXT = "#f0efe8";
const MUTED = "rgba(255,255,255,0.55)";
const MUTED2 = "rgba(255,255,255,0.35)";

const STATUS_FILTERS: Array<{ value: SubmissionStatus | "all"; label: string; labelAr: string }> = [
  { value: "all", label: "All", labelAr: "الكل" },
  { value: "draft", label: "Drafts", labelAr: "مسودّات" },
  { value: "submitted", label: "Pending", labelAr: "في الانتظار" },
  { value: "rejected", label: "Rejected", labelAr: "مرفوض" },
  { value: "accepted", label: "Accepted", labelAr: "مقبول" },
  { value: "no_response", label: "No Response", labelAr: "بلا ردّ" },
  { value: "withdrawn", label: "Withdrawn", labelAr: "مسحوب" },
];

interface Props {
  ar: boolean;
  bookId?: number;
}

export function SubmissionTracker({ ar, bookId }: Props) {
  const { data: subs = [], isLoading } = useSubmissions(bookId);
  const { data: stats } = useSubmissionStats();
  const [filter, setFilter] = useState<SubmissionStatus | "all">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return subs;
    return subs.filter((s) => s.status === filter);
  }, [subs, filter]);

  // Surfaces a list of overdue follow-ups at the very top so the
  // writer knows what's actionable today.
  const today = new Date().toISOString();
  const overdueFollowUps = useMemo(
    () => subs.filter((s) => s.followUpAt && s.followUpAt < today && s.status === "submitted"),
    [subs, today],
  );

  return (
    <div style={{ fontFamily: SF, color: TEXT }}>
      {/* Headline stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <StatTile
          icon={<Inbox size={14} />}
          label={ar ? "إجمالي" : "Total"}
          value={stats?.total ?? 0}
        />
        <StatTile
          icon={<Send size={14} />}
          label={ar ? "في الانتظار" : "Pending"}
          value={stats?.pending ?? 0}
          color="#60a5fa"
        />
        <StatTile
          icon={<X size={14} />}
          label={ar ? "مرفوض" : "Rejected"}
          value={stats?.rejected ?? 0}
          color="#fca5a5"
        />
        <StatTile
          icon={<Check size={14} />}
          label={ar ? "مقبول" : "Accepted"}
          value={stats?.accepted ?? 0}
          color="#86efac"
        />
        <StatTile
          icon={<Clock size={14} />}
          label={ar ? "متوسّط الرد" : "Avg. Response"}
          value={stats?.avgResponseDays ? `${stats.avgResponseDays}d` : "—"}
          color="#fcd34d"
        />
      </div>

      {/* Overdue follow-up banner */}
      {overdueFollowUps.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(251,191,36,0.10)",
            border: "1px solid rgba(251,191,36,0.25)",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 16,
          }}
        >
          <AlertTriangle size={15} color="#fcd34d" />
          <div style={{ fontSize: 13, color: "#fcd34d", flex: 1 }}>
            <strong>{overdueFollowUps.length}</strong>{" "}
            {ar
              ? "متابعة متأخّرة عن موعدها — تواصل من جديد أو حدّث الحالة."
              : `follow-up${overdueFollowUps.length === 1 ? "" : "s"} are overdue — nudge them or mark no-response.`}
          </div>
        </div>
      )}

      {/* Status filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {STATUS_FILTERS.map((f) => {
          const active = filter === f.value;
          const count =
            f.value === "all"
              ? subs.length
              : subs.filter((s) => s.status === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                fontFamily: SF,
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                padding: "6px 12px",
                borderRadius: 999,
                background: active ? TEXT : CARD,
                color: active ? "#000" : MUTED,
                border: `1px solid ${active ? TEXT : BORDER}`,
                cursor: "pointer",
                transition: "all 120ms",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {ar ? f.labelAr : f.label}
              <span
                style={{
                  fontSize: 10.5,
                  fontVariantNumeric: "tabular-nums",
                  opacity: active ? 0.7 : 0.55,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      {isLoading ? (
        <SkeletonRows />
      ) : filtered.length === 0 ? (
        <EmptyState ar={ar} hasAny={subs.length > 0} filter={filter} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((s) => (
            <SubmissionRow key={s.id} sub={s} ar={ar} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────

function StatTile({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: color ?? MUTED, marginBottom: 6 }}>
        {icon}
        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: color ?? TEXT,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ── Submission row ────────────────────────────────────────────────

function SubmissionRow({ sub, ar }: { sub: Submission; ar: boolean }) {
  const update = useUpdateSubmission();
  const del = useDeleteSubmission();
  const [expanded, setExpanded] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const colors = statusColors(sub.status);
  const respDays = daysBetween(sub.submittedAt, sub.respondedAt);
  const daysOpen = sub.submittedAt && !sub.respondedAt
    ? daysBetween(sub.submittedAt, new Date().toISOString())
    : null;

  const handleStatusChange = (status: SubmissionStatus) => {
    const patch: Parameters<typeof update.mutate>[0] = { id: sub.id, status };
    // Auto-stamp dates when status transitions in obvious ways.
    if (status === "submitted" && !sub.submittedAt) {
      patch.submittedAt = new Date().toISOString();
    }
    if ((status === "rejected" || status === "accepted") && !sub.respondedAt) {
      patch.respondedAt = new Date().toISOString();
    }
    update.mutate(patch);
    setShowStatusMenu(false);
  };

  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: "14px 16px",
        transition: "background 120ms",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = CARD_HOVER)}
      onMouseLeave={(e) => (e.currentTarget.style.background = CARD)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Recipient name + key */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, letterSpacing: "-0.005em" }}>
            {sub.recipientName}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: MUTED2,
              marginTop: 2,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span>{sub.recipientKey.startsWith("agent:") ? (ar ? "وكيل أدبي" : "Literary Agent") : (ar ? "ناشر" : "Publisher")}</span>
            {sub.submittedAt && (
              <>
                <span>·</span>
                <span>
                  {ar ? "بُعِث" : "Sent"} {formatDate(sub.submittedAt, ar)}
                </span>
              </>
            )}
            {daysOpen !== null && daysOpen >= 0 && (
              <>
                <span>·</span>
                <span style={{ color: daysOpen > 60 ? "#fcd34d" : MUTED2 }}>
                  {daysOpen} {ar ? "يوم مفتوحة" : daysOpen === 1 ? "day open" : "days open"}
                </span>
              </>
            )}
            {respDays !== null && (
              <>
                <span>·</span>
                <span>
                  {ar ? "ردّ خلال" : "Responded in"} {respDays}d
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowStatusMenu((v) => !v)}
            style={{
              fontFamily: SF,
              fontSize: 11.5,
              fontWeight: 700,
              padding: "5px 10px",
              borderRadius: 999,
              background: colors.bg,
              color: colors.fg,
              border: `1px solid ${colors.border}`,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {statusLabel(sub.status, ar)}
            <ChevronDown size={11} />
          </button>
          {showStatusMenu && (
            <>
              <div
                onClick={() => setShowStatusMenu(false)}
                style={{ position: "fixed", inset: 0, zIndex: 30 }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  insetInlineEnd: 0,
                  background: "#1a1a1c",
                  border: `1px solid ${BORDER_STRONG}`,
                  borderRadius: 10,
                  padding: 4,
                  zIndex: 40,
                  boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                  minWidth: 160,
                }}
              >
                {(["draft", "submitted", "rejected", "accepted", "no_response", "withdrawn"] as SubmissionStatus[]).map((st) => {
                  const c = statusColors(st);
                  const active = sub.status === st;
                  return (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      style={{
                        fontFamily: SF,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "8px 10px",
                        background: active ? "rgba(255,255,255,0.06)" : "transparent",
                        border: "none",
                        borderRadius: 6,
                        color: c.fg,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        textAlign: ar ? "right" : "left",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = active ? "rgba(255,255,255,0.06)" : "transparent")}
                    >
                      {statusLabel(st, ar)}
                      {active && <Check size={12} color={c.fg} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Toggle expand */}
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse" : "Expand"}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: MUTED,
            padding: 4,
            display: "inline-flex",
          }}
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => {
            if (confirm(ar ? "حذف هذا التقديم؟" : "Delete this submission?")) {
              del.mutate(sub.id);
            }
          }}
          aria-label={ar ? "حذف" : "Delete"}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: MUTED2,
            padding: 4,
            display: "inline-flex",
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: `1px solid ${BORDER}`,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          <Field
            label={ar ? "تاريخ الإرسال" : "Submitted at"}
            value={sub.submittedAt?.slice(0, 10) ?? ""}
            type="date"
            onChange={(v) => update.mutate({ id: sub.id, submittedAt: v ? new Date(v).toISOString() : null })}
          />
          <Field
            label={ar ? "تاريخ المتابعة" : "Follow-up reminder"}
            value={sub.followUpAt?.slice(0, 10) ?? ""}
            type="date"
            onChange={(v) => update.mutate({ id: sub.id, followUpAt: v ? new Date(v).toISOString() : null })}
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {ar ? "ملاحظات" : "Notes"}
            </label>
            <textarea
              defaultValue={sub.notes ?? ""}
              onBlur={(e) => {
                if (e.target.value !== (sub.notes ?? "")) {
                  update.mutate({ id: sub.id, notes: e.target.value });
                }
              }}
              placeholder={ar ? "ملاحظات (نصّ الرفض، طلب المخطوطة الكاملة، إلخ)" : "Notes (rejection text, full manuscript request, etc.)"}
              rows={3}
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
                lineHeight: 1.5,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, type, onChange,
}: {
  label: string;
  value: string;
  type: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </label>
      <input
        type={type}
        defaultValue={value}
        onBlur={(e) => {
          if (e.target.value !== value) onChange(e.target.value);
        }}
        style={{
          fontFamily: SF,
          width: "100%",
          marginTop: 6,
          padding: "9px 12px",
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
  );
}

// ── Empty + skeleton ──────────────────────────────────────────────

function EmptyState({ ar, hasAny, filter }: { ar: boolean; hasAny: boolean; filter: SubmissionStatus | "all" }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "60px 20px",
        background: CARD,
        border: `1px dashed ${BORDER}`,
        borderRadius: 16,
      }}
    >
      <Sparkles size={28} color={MUTED2} style={{ marginBottom: 14 }} />
      <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
        {!hasAny
          ? ar
            ? "لا تقديمات بعد"
            : "No submissions yet"
          : ar
            ? "لا تقديمات بهذه الحالة"
            : "Nothing in this status"}
      </div>
      <div style={{ fontSize: 13, color: MUTED, maxWidth: 380, margin: "0 auto", lineHeight: 1.6 }}>
        {!hasAny
          ? ar
            ? "ابحث عن ناشر في دليل الناشرين، واضغط «تتبّع التقديم» لتبدأ سجلّك."
            : "Browse the Publisher Directory and hit \"Track Submission\" on any card to start your log."
          : ar
            ? `جرّب فلتر آخر أو "${"all" === filter ? "" : "All"}".`
            : "Try another filter or \"All\"."}
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: "14px 16px",
            opacity: 0.4,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, width: "40%", background: "rgba(255,255,255,0.1)", borderRadius: 4 }} />
            <div style={{ height: 10, width: "60%", background: "rgba(255,255,255,0.06)", borderRadius: 4, marginTop: 6 }} />
          </div>
          <div style={{ height: 22, width: 80, background: "rgba(255,255,255,0.08)", borderRadius: 999 }} />
        </div>
      ))}
    </div>
  );
}

function formatDate(iso: string, ar: boolean): string {
  const d = new Date(iso);
  return d.toLocaleDateString(ar ? "ar-EG" : "en-US", { month: "short", day: "numeric", year: "numeric" });
}

void ExternalLink; // imported for future use
