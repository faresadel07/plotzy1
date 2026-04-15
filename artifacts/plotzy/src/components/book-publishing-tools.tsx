import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import {
  Hash, Users, Plus, Trash2, Check, X, Mail,
  ExternalLink, ChevronDown, ChevronUp, Loader2, Send, BookOpen, Printer, Package
} from "lucide-react";
import { PrintPreviewButton } from "@/components/print-preview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

interface ArcRecipient { id: number; bookId: number; name: string; email: string; status: string; note: string | null; sentAt: string; }

const STATUS_MAP = {
  sent:     { label: "Sent",     color: "text-blue-400 bg-blue-950/30 border-blue-800/50" },
  opened:   { label: "Opened",   color: "text-amber-400 bg-amber-950/30 border-amber-800/50" },
  reviewed: { label: "Reviewed", color: "text-green-400 bg-green-950/30 border-green-800/50" },
  declined: { label: "Declined", color: "text-red-400 bg-red-950/30 border-red-800/50" },
};

const ICON_BG = "rgba(255,255,255,0.04)";
const ICON_COLOR = "rgba(255,255,255,0.5)";
const CARD = "border border-border/20 rounded-2xl overflow-hidden";

// ─── ISBN ─────────────────────────────────────────────────────────────────────

function ISBNSection({ bookId, currentIsbn }: { bookId: number; currentIsbn?: string | null }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isbn, setIsbn] = useState(currentIsbn || "");
  const [editing, setEditing] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/books/${bookId}/isbn`, { isbn }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/books", bookId] }); toast({ title: ar ? "تم حفظ ISBN" : "ISBN saved!" }); setEditing(false); },
    onError: () => toast({ title: ar ? "فشل الحفظ" : "Save failed", variant: "destructive" }),
  });

  return (
    <div className={CARD} style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: ICON_BG }}>
            <Hash className="w-4 h-4" style={{ color: ICON_COLOR }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{ar ? "رقم ISBN" : "ISBN Number"}</p>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{ar ? "معرف دولي فريد لكتابك" : "Unique international book identifier"}</p>
          </div>
        </div>

        {!editing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-xl min-h-[36px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {isbn ? (
                  <span className="text-sm font-mono font-medium">{isbn}</span>
                ) : (
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>{ar ? "لم يُحدَّد بعد" : "Not set yet"}</span>
                )}
              </div>
              <button onClick={() => setEditing(true)} className="text-[12px] font-medium px-4 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {ar ? "تعديل" : "Edit"}
              </button>
            </div>

            {/* Barcode preview + download */}
            {isbn && isbn.replace(/[-\s]/g, "").length === 13 && /^\d{13}$/.test(isbn.replace(/[-\s]/g, "")) && (
              <div className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <img src={`/api/isbn/barcode/${isbn.replace(/[-\s]/g, "")}`} alt="ISBN Barcode"
                  style={{ margin: "0 auto", maxHeight: 90, borderRadius: 6, background: "#fff", padding: 12 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="flex justify-center gap-2 mt-3">
                  <a href={`/api/isbn/barcode/${isbn.replace(/[-\s]/g, "")}/download`} download
                    className="text-[12px] font-semibold px-4 py-2 rounded-lg inline-flex items-center gap-1.5"
                    style={{ background: "#fff", color: "#000", textDecoration: "none" }}>
                    ↓ {ar ? "تحميل الباركود" : "Download Barcode PNG"}
                  </a>
                </div>
                <p className="text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                  {ar ? "استخدم هذا الباركود على ظهر غلاف كتابك" : "Use this barcode on the back of your book cover"}
                </p>
              </div>
            )}

            {/* Invalid ISBN warning */}
            {isbn && isbn.replace(/[-\s]/g, "").length > 0 && (isbn.replace(/[-\s]/g, "").length !== 13 || !/^\d{13}$/.test(isbn.replace(/[-\s]/g, ""))) && (
              <p className="text-[11px]" style={{ color: "#f87171" }}>
                {ar ? "رقم ISBN غير صالح. يجب أن يكون 13 رقماً (ISBN-13)" : "Invalid ISBN. Must be exactly 13 digits (ISBN-13 format: 978-...)"}
              </p>
            )}

            {/* How to get ISBN — always visible */}
            <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.06)" }}>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                {ar ? "كيف تحصل على رقم ISBN؟" : "How to get an ISBN?"}
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.25)" }}>
                {ar
                  ? "رقم ISBN هو معرّف دولي فريد لكتابك. يُطلب عند البيع في المكتبات وAmazon. يمكنك الحصول عليه من وكالة ISBN في بلدك أو شراؤه من:"
                  : "An ISBN is a unique identifier required for selling on Amazon, bookstores, and libraries. Get one from your country's ISBN agency or purchase from:"}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <a href="https://www.isbn.org" target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-medium px-2 py-1 rounded"
                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none" }}>
                  isbn.org →
                </a>
                <a href="https://www.myidentifiers.com" target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-medium px-2 py-1 rounded"
                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none" }}>
                  myidentifiers.com →
                </a>
              </div>
              <p className="text-[9px] mt-2" style={{ color: "rgba(255,255,255,0.15)" }}>
                {ar
                  ? "ملاحظة: Amazon KDP يوفر رقم ISBN مجاني إذا نشرت عبرهم حصرياً."
                  : "Note: Amazon KDP provides a free ISBN if you publish exclusively through them."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Input value={isbn} onChange={e => setIsbn(e.target.value)} placeholder="978-0-00-000000-0" className="font-mono text-sm" />
            <div className="flex gap-2">
              <button className="text-[12px] font-semibold px-4 py-1.5 rounded-lg" style={{ background: "#fff", color: "#000" }} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "..." : (ar ? "حفظ" : "Save")}
              </button>
              <button className="text-[12px] px-3 py-1.5 rounded-lg" style={{ color: "rgba(255,255,255,0.4)" }} onClick={() => { setEditing(false); setIsbn(currentIsbn || ""); }}>
                {ar ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ARC Distribution ─────────────────────────────────────────────────────────

function ARCSection({ bookId }: { bookId: number }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", note: "" });

  const { data: recipients = [], isLoading } = useQuery<ArcRecipient[]>({
    queryKey: ["/api/books", bookId, "arc"],
    queryFn: () => fetch(`/api/books/${bookId}/arc`).then(r => r.json()),
  });

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/books/${bookId}/arc`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/books", bookId, "arc"] }); setForm({ name: "", email: "", note: "" }); setAddOpen(false); toast({ title: ar ? "تمت الإضافة" : "Recipient added!" }); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiRequest("PATCH", `/api/books/${bookId}/arc/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/books", bookId, "arc"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/books/${bookId}/arc/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/books", bookId, "arc"] }); toast({ title: ar ? "تم الحذف" : "Removed" }); },
  });

  return (
    <div className={CARD} style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="p-4">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-3 w-full text-left">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: ICON_BG }}>
            <Users className="w-4 h-4" style={{ color: ICON_COLOR }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{ar ? "توزيع نسخ ARC" : "ARC Distribution"}</p>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{ar ? "نسخ مبكرة للمراجعين" : "Send advance copies to reviewers"}</p>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
            {recipients.length}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />}
        </button>

        {expanded && (
          <div className="mt-4 space-y-3">
            {addOpen ? (
              <div className="p-3 rounded-xl space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder={ar ? "الاسم" : "Name"} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="text-sm" />
                  <Input placeholder={ar ? "البريد" : "Email"} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="text-sm" />
                </div>
                <Input placeholder={ar ? "ملاحظة (اختياري)" : "Note (optional)"} value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} className="text-sm" />
                <div className="flex gap-2">
                  <button className="text-[12px] font-semibold px-4 py-1.5 rounded-lg" style={{ background: "#fff", color: "#000" }} onClick={() => addMutation.mutate()} disabled={!form.name || !form.email}>
                    {addMutation.isPending ? "..." : (ar ? "إضافة" : "Add")}
                  </button>
                  <button className="text-[12px] px-3 py-1.5 rounded-lg" style={{ color: "rgba(255,255,255,0.4)" }} onClick={() => setAddOpen(false)}>
                    {ar ? "إلغاء" : "Cancel"}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddOpen(true)} className="w-full rounded-xl py-2.5 text-[12px] font-medium border border-dashed transition-all" style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
                + {ar ? "إضافة مراجع" : "Add Recipient"}
              </button>
            )}

            {recipients.length === 0 && !addOpen ? (
              <p className="text-center py-4 text-[12px]" style={{ color: "rgba(255,255,255,0.25)" }}>{ar ? "لا مراجعون بعد" : "No recipients yet"}</p>
            ) : (
              recipients.map(r => {
                const s = STATUS_MAP[r.status as keyof typeof STATUS_MAP] || STATUS_MAP.sent;
                return (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl group" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                      {r.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] font-semibold">{r.name}</span>
                      <span className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                      <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.3)" }}>{r.email}</p>
                    </div>
                    <button onClick={() => deleteMutation.mutate(r.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded" style={{ color: "rgba(255,255,255,0.3)" }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KDP Guide ────────────────────────────────────────────────────────────────

function KDPSection({ bookId, bookTitle }: { bookId: number; bookTitle: string }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [expanded, setExpanded] = useState(false);

  const steps = ar
    ? ["أكمل كتابة جميع الفصول وراجعها", "صمّم غلاف الكتاب (6x9 بوصة)", "اختر تصنيف BISAC المناسب", "أعدّ صفحة About the Author", "حدد سعر البيع", "نزّل PDF وارفعه على KDP"]
    : ["Complete all chapters and proofread", "Design book cover (6×9 inches)", "Choose the right BISAC category", "Prepare the About the Author page", "Set your price (35% or 70% royalty)", "Download PDF and upload to KDP"];

  return (
    <div className={CARD} style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="p-4">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-3 w-full text-left">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: ICON_BG }}>
            <Package className="w-4 h-4" style={{ color: ICON_COLOR }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{ar ? "النشر على Amazon KDP" : "Publish on Amazon KDP"}</p>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{ar ? "دليل النشر المستقل" : "Self-publishing checklist"}</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />}
        </button>

        {expanded && (
          <div className="mt-4 space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>{i + 1}</span>
                <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>{step}</p>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a href="https://kdp.amazon.com" target="_blank" rel="noopener noreferrer">
                <button className="w-full text-[12px] font-semibold py-2 rounded-lg" style={{ background: "#fff", color: "#000" }}>
                  {ar ? "افتح KDP" : "Open KDP"} ↗
                </button>
              </a>
              <a href={`/api/books/${bookId}/download?format=pdf`} download>
                <button className="w-full text-[12px] font-medium py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {ar ? "تحميل PDF" : "Download PDF"}
                </button>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function BookPublishingTools({ bookId, bookTitle, currentIsbn }: { bookId: number; bookTitle: string; currentIsbn?: string | null }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  return (
    <div className="space-y-3">
      {/* Print Preview */}
      <div className={CARD} style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: ICON_BG }}>
            <Printer className="w-4 h-4" style={{ color: ICON_COLOR }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{ar ? "معاينة الطباعة" : "Print Layout Preview"}</p>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{ar ? "كيف يبدو كتابك بتنسيق PDF" : "See how your book looks in PDF format"}</p>
          </div>
          <PrintPreviewButton bookId={bookId} bookTitle={bookTitle} />
        </div>
      </div>

      <ISBNSection bookId={bookId} currentIsbn={currentIsbn} />
      <ARCSection bookId={bookId} />
      <KDPSection bookId={bookId} bookTitle={bookTitle} />
    </div>
  );
}
