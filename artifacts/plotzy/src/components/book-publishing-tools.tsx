import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import {
  Hash, Users, Plus, Trash2, Check, X, Mail, User,
  ExternalLink, ChevronDown, ChevronUp, Loader2, Send, BookOpen, Printer
} from "lucide-react";
import { PrintPreviewButton } from "@/components/print-preview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

interface ArcRecipient {
  id: number;
  bookId: number;
  name: string;
  email: string;
  status: string;
  note: string | null;
  sentAt: string;
}

const STATUS_MAP = {
  sent:     { label: "Sent",     color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200" },
  opened:   { label: "Opened",   color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200" },
  reviewed: { label: "Reviewed", color: "text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200" },
  declined: { label: "Declined", color: "text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200" },
};

// ─── ISBN Management ─────────────────────────────────────────────────────────

function ISBNSection({ bookId, currentIsbn }: { bookId: number; currentIsbn?: string | null }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isbn, setIsbn] = useState(currentIsbn || "");
  const [editing, setEditing] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/books/${bookId}/isbn`, { isbn }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/books", bookId] });
      qc.invalidateQueries({ queryKey: [`/api/books/${bookId}`] });
      toast({ title: ar ? "تم حفظ رقم ISBN" : "ISBN saved!" });
      setEditing(false);
    },
    onError: () => toast({ title: ar ? "فشل الحفظ" : "Save failed", variant: "destructive" }),
  });

  const isValidISBN = (s: string) => /^(?:97[89])?\d{9}[\dX]$/.test(s.replace(/[-\s]/g, ""));

  return (
    <div className="border border-border/30 rounded-2xl overflow-hidden bg-card">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center text-emerald-500">
            <Hash className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="font-semibold text-sm">{ar ? "رقم ISBN" : "ISBN Number"}</p>
            <p className="text-xs text-muted-foreground">{ar ? "معرف دولي فريد لكتابك" : "Unique international identifier for your book"}</p>
          </div>
        </div>

        {!editing ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-xl bg-muted/20 border border-border/20 min-h-[36px]">
              {isbn ? (
                <span className="text-sm font-mono font-medium">{isbn}</span>
              ) : (
                <span className="text-sm text-muted-foreground/50">{ar ? "لم يُحدَّد بعد" : "Not set yet"}</span>
              )}
            </div>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setEditing(true)}>
              {ar ? "تعديل" : "Edit"}
            </Button>
            {isbn && (
              <a href={`https://www.isbn-search.com/search.aspx?isbn=${isbn.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" className="rounded-xl px-2">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              value={isbn}
              onChange={e => setIsbn(e.target.value)}
              placeholder="978-0-00-000000-0"
              className="font-mono text-sm"
            />
            {isbn && !isValidISBN(isbn) && (
              <p className="text-xs text-amber-500">{ar ? "تحقق من صحة رقم ISBN" : "Verify ISBN format (10 or 13 digits)"}</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" className="rounded-xl" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {ar ? "حفظ" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => { setEditing(false); setIsbn(currentIsbn || ""); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div className="mt-3 p-2.5 rounded-lg bg-muted/10 border border-border/10">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {ar
              ? "احصل على رقم ISBN مجاني عبر خدمات التسجيل الوطنية أو قم بشراء رقم من متاجر متخصصة. أماكن الحصول عليه: "
              : "Get a free ISBN through national registration agencies, or purchase from specialized providers. "}
            <a href="https://www.isbn.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ISBN.org</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── ARC Distribution ────────────────────────────────────────────────────────

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/books", bookId, "arc"] });
      setForm({ name: "", email: "", note: "" });
      setAddOpen(false);
      toast({ title: ar ? "تمت إضافة المراجع" : "ARC recipient added!" });
    },
    onError: () => toast({ title: ar ? "فشلت الإضافة" : "Failed to add", variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/books/${bookId}/arc/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/books", bookId, "arc"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/books/${bookId}/arc/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/books", bookId, "arc"] });
      toast({ title: ar ? "تم الحذف" : "Removed" });
    },
  });

  return (
    <div className="border border-border/30 rounded-2xl overflow-hidden bg-card">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center text-blue-500">
            <Users className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{ar ? "توزيع نسخ ARC" : "ARC Distribution"}</p>
            <p className="text-xs text-muted-foreground">{ar ? "إرسال نسخ مبكرة للمراجعين والقراء الحساسين" : "Send advance copies to reviewers and early readers"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-blue-100 dark:bg-blue-950/40 text-blue-600 px-2 py-0.5 rounded-full">
              {recipients.length} {ar ? "مراجع" : "recipients"}
            </span>
            <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-lg hover:bg-muted/20">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <>
            {/* Add form */}
            {addOpen ? (
              <div className="mb-3 p-3 rounded-xl border border-border/30 bg-muted/10 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder={ar ? "الاسم" : "Name"} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="text-sm" />
                  <Input placeholder={ar ? "البريد الإلكتروني" : "Email"} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="text-sm" />
                </div>
                <Input placeholder={ar ? "ملاحظة (اختياري)" : "Note (optional)"} value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} className="text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-xl" onClick={() => addMutation.mutate()} disabled={!form.name || !form.email || addMutation.isPending}>
                    {addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {ar ? "إضافة" : "Add"}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setAddOpen(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="w-full rounded-xl mb-3 text-xs" onClick={() => setAddOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {ar ? "إضافة مراجع جديد" : "Add Recipient"}
              </Button>
            )}

            {/* Recipients list */}
            {isLoading ? (
              <div className="py-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" /></div>
            ) : recipients.length === 0 ? (
              <div className="py-6 text-center">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">{ar ? "لا يوجد مراجعون بعد" : "No ARC recipients yet"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recipients.map(r => {
                  const statusInfo = STATUS_MAP[r.status as keyof typeof STATUS_MAP] || STATUS_MAP.sent;
                  return (
                    <div key={r.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/10 border border-border/20 group">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                        {r.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold">{r.name}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusInfo.color}`}>{statusInfo.label}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{r.email}</p>
                        {r.note && <p className="text-[11px] text-muted-foreground/70 italic mt-0.5">{r.note}</p>}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Select value={r.status} onValueChange={status => statusMutation.mutate({ id: r.id, status })}>
                          <SelectTrigger className="h-6 w-24 text-[10px] rounded-lg border-border/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_MAP).map(([k, v]) => (
                              <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg" onClick={() => deleteMutation.mutate(r.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Direct-to-Amazon KDP Section ────────────────────────────────────────────

function KDPSection({ bookId, bookTitle }: { bookId: number; bookTitle: string }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [expanded, setExpanded] = useState(false);

  const steps = ar ? [
    { done: false, text: "أكمل كتابة جميع الفصول وراجعها" },
    { done: false, text: "صمّم غلاف الكتاب (6x9 بوصة لـ KDP)" },
    { done: false, text: "اختر تصنيف BISAC المناسب لكتابك" },
    { done: false, text: "أعدّ صفحة About the Author" },
    { done: false, text: "حدد سعر البيع (نسبة أرباح 35% أو 70%)" },
    { done: false, text: "نزّل ملف PDF وارفعه على KDP" },
  ] : [
    { done: false, text: "Complete all chapters and proofread" },
    { done: false, text: "Design book cover (6×9 inches for KDP)" },
    { done: false, text: "Choose the right BISAC category" },
    { done: false, text: "Prepare the About the Author page" },
    { done: false, text: "Set your price (35% or 70% royalty)" },
    { done: false, text: "Download PDF and upload to KDP" },
  ];

  return (
    <div className="border border-border/30 rounded-2xl overflow-hidden bg-card">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{ar ? "النشر على Amazon KDP" : "Publish on Amazon KDP"}</p>
            <p className="text-xs text-muted-foreground">{ar ? "دليل خطوة بخطوة للنشر المستقل" : "Step-by-step self-publishing guide"}</p>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-lg hover:bg-muted/20">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-3 space-y-3">
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full border-2 border-border/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-muted-foreground">{i + 1}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <a href="https://kdp.amazon.com" target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="w-full rounded-xl text-xs bg-orange-500 hover:bg-orange-600 text-white border-0">
                  <ExternalLink className="w-3 h-3 mr-1.5" />
                  {ar ? "افتح KDP" : "Open KDP"}
                </Button>
              </a>
              <a href={`/api/books/${bookId}/download?format=pdf`} download>
                <Button size="sm" variant="outline" className="w-full rounded-xl text-xs">
                  {ar ? "تحميل PDF" : "Download PDF"}
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function BookPublishingTools({ bookId, bookTitle, currentIsbn }: {
  bookId: number;
  bookTitle: string;
  currentIsbn?: string | null;
}) {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  return (
    <div className="space-y-3">
      <div className="border border-border/30 rounded-2xl overflow-hidden bg-card p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center text-indigo-500 flex-shrink-0">
          <Printer className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{ar ? "معاينة الطباعة" : "Print Layout Preview"}</p>
          <p className="text-xs text-muted-foreground">{ar ? "انظر كيف يبدو كتابك بتنسيق PDF" : "See how your book looks in PDF format"}</p>
        </div>
        <PrintPreviewButton bookId={bookId} bookTitle={bookTitle} />
      </div>
      <ISBNSection bookId={bookId} currentIsbn={currentIsbn} />
      <ARCSection bookId={bookId} />
      <KDPSection bookId={bookId} bookTitle={bookTitle} />
    </div>
  );
}
