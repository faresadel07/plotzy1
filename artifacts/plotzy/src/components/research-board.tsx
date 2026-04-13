import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useResearchItems, useCreateResearchItem, useDeleteResearchItem, useUpdateResearchItem, fetchUrlPreview } from "@/hooks/use-research";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { Link2, StickyNote, Image, Plus, Trash2, X, Loader2, ExternalLink, Pencil, Check, Search, Upload, GripVertical } from "lucide-react";
import type { ResearchItem } from "@/shared/schema";

const NOTE_COLORS: { key: string; bg: string; border: string; label: string }[] = [
  { key: "default",  bg: "bg-card",                border: "border-border/40",     label: "Default"  },
  { key: "amber",    bg: "bg-amber-50 dark:bg-amber-950/40",  border: "border-amber-300/60",  label: "Amber"    },
  { key: "sky",      bg: "bg-sky-50 dark:bg-sky-950/40",      border: "border-sky-300/60",    label: "Sky"      },
  { key: "rose",     bg: "bg-rose-50 dark:bg-rose-950/40",    border: "border-rose-300/60",   label: "Rose"     },
  { key: "green",    bg: "bg-green-50 dark:bg-green-950/40",  border: "border-green-300/60",  label: "Green"    },
  { key: "violet",   bg: "bg-violet-50 dark:bg-violet-950/40",border: "border-violet-300/60", label: "Violet"   },
];

function getColor(key: string | null | undefined) {
  return NOTE_COLORS.find(c => c.key === key) || NOTE_COLORS[0];
}

interface AddDialogProps { bookId: number; onClose: () => void; ar: boolean; }

function AddDialog({ bookId, onClose, ar }: AddDialogProps) {
  const [type, setType] = useState<"note" | "link" | "image">("note");
  const [noteText, setNoteText] = useState("");
  const [noteColor, setNoteColor] = useState("default");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const create = useCreateResearchItem(bookId);

  const handleAdd = async () => {
    if (type === "note") {
      if (!noteText.trim()) return;
      await create.mutateAsync({ type: "note", content: noteText.trim(), color: noteColor });
    } else if (type === "link") {
      if (!linkUrl.trim()) return;
      setLoading(true);
      try {
        const preview = await fetchUrlPreview(linkUrl.trim());
        await create.mutateAsync({ type: "link", title: preview.title, content: preview.url, previewImageUrl: preview.image || preview.favicon, description: preview.description });
      } catch {
        await create.mutateAsync({ type: "link", content: linkUrl.trim(), title: new URL(linkUrl.trim()).hostname });
      } finally { setLoading(false); }
    } else if (type === "image") {
      const src = imagePreview || imageUrl.trim();
      if (!src) return;
      await create.mutateAsync({ type: "image", content: src });
    }
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Max 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setImageUrl("");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (typeof document === "undefined" || !document.body) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-background border border-border/40 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">{ar ? "إضافة عنصر بحث" : "Add Research Item"}</h3>
          <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Type Selector */}
        <div className="flex gap-2 mb-5 p-1 bg-muted/40 rounded-xl">
          {([
            { t: "note",  icon: StickyNote, label: ar ? "ملاحظة" : "Note"  },
            { t: "link",  icon: Link2,      label: ar ? "رابط"   : "Link"  },
            { t: "image", icon: Image,      label: ar ? "صورة"   : "Image" },
          ] as const).map(({ t, icon: Icon, label }) => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${type === t ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Note Form */}
        {type === "note" && (
          <div className="space-y-3">
            <textarea className="w-full rounded-xl border border-border/40 bg-muted/30 p-3 text-sm resize-none outline-none focus:border-primary/40 transition-colors" rows={5}
              placeholder={ar ? "اكتب ملاحظتك هنا..." : "Write your note here..."} value={noteText} onChange={e => setNoteText(e.target.value)} autoFocus />
            <div className="flex gap-1.5 items-center">
              <span className="text-xs text-muted-foreground mr-1">{ar ? "اللون:" : "Color:"}</span>
              {NOTE_COLORS.map(c => (
                <button key={c.key} onClick={() => setNoteColor(c.key)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${c.bg} ${noteColor === c.key ? "scale-125 border-foreground/60" : "border-transparent hover:scale-110"}`} title={c.label} />
              ))}
            </div>
          </div>
        )}

        {/* Link Form */}
        {type === "link" && (
          <input type="url" className="w-full rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary/40 transition-colors"
            placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} autoFocus />
        )}

        {/* Image Form — URL or Upload */}
        {type === "image" && (
          <div className="space-y-3">
            {/* Upload button */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-border/40 bg-muted/10 py-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-foreground/20 hover:text-foreground transition-all">
              <Upload className="w-6 h-6" />
              <span className="text-sm font-medium">{ar ? "ارفع صورة من جهازك" : "Upload from device"}</span>
              <span className="text-[11px] opacity-50">{ar ? "أو الصق رابط أدناه" : "or paste a URL below"}</span>
            </button>

            {/* URL input */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border/30" />
              <span className="text-[10px] text-muted-foreground uppercase">{ar ? "أو" : "or"}</span>
              <div className="h-px flex-1 bg-border/30" />
            </div>
            <input type="url" className="w-full rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary/40 transition-colors"
              placeholder={ar ? "رابط الصورة (URL)..." : "Image URL..."} value={imageUrl}
              onChange={e => { setImageUrl(e.target.value); setImagePreview(null); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()} />

            {/* Preview */}
            {(imagePreview || imageUrl) && (
              <div className="rounded-xl overflow-hidden bg-muted/30 h-36 relative">
                <img src={imagePreview || imageUrl} alt="preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                {imagePreview && (
                  <button onClick={() => setImagePreview(null)} className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-black/60 flex items-center justify-center text-white">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>{ar ? "إلغاء" : "Cancel"}</Button>
          <Button className="flex-1 rounded-xl" onClick={handleAdd} disabled={loading || create.isPending}>
            {loading || create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (ar ? "إضافة" : "Add")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function NoteCard({ item, bookId, ar }: { item: ResearchItem; bookId: number; ar: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.content);
  const color = getColor(item.color);
  const del = useDeleteResearchItem(bookId);
  const upd = useUpdateResearchItem(bookId);

  return (
    <div className={`relative group rounded-2xl border p-4 ${color.bg} ${color.border} break-inside-avoid mb-3`}>
      {editing ? (
        <div className="space-y-2">
          <textarea className="w-full bg-transparent text-sm resize-none outline-none leading-relaxed" value={text} onChange={e => setText(e.target.value)} rows={Math.max(3, text.split("\n").length + 1)} autoFocus />
          <div className="flex gap-1 justify-end">
            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-lg" onClick={() => setEditing(false)}><X className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-lg text-primary" onClick={() => { upd.mutate({ id: item.id, content: text }); setEditing(false); }}><Check className="w-3 h-3" /></Button>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
      )}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)} className="w-6 h-6 rounded-lg bg-background/70 hover:bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm"><Pencil className="w-3 h-3" /></button>
        <button onClick={() => del.mutate(item.id)} className="w-6 h-6 rounded-lg bg-background/70 hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors shadow-sm"><Trash2 className="w-3 h-3" /></button>
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground/40">
        {new Date(item.createdAt!).toLocaleDateString(ar ? "ar" : "en", { month: "short", day: "numeric" })}
      </div>
    </div>
  );
}

function LinkCard({ item, bookId, ar }: { item: ResearchItem; bookId: number; ar: boolean }) {
  const del = useDeleteResearchItem(bookId);
  const hostname = (() => { try { return new URL(item.content).hostname; } catch { return item.content; } })();
  return (
    <div className="relative group rounded-2xl border border-border/40 bg-card overflow-hidden break-inside-avoid mb-3 hover:border-primary/30 transition-colors">
      {item.previewImageUrl && (
        <div className="h-28 overflow-hidden bg-muted/20">
          <img src={item.previewImageUrl} alt={item.title || ""} className="w-full h-full object-cover" onError={e => (e.currentTarget.parentElement!.style.display = "none")} />
        </div>
      )}
      <div className="p-3">
        {item.title && <p className="font-semibold text-sm line-clamp-2 mb-1">{item.title}</p>}
        {item.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>}
        <a href={item.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-primary hover:underline">
          <ExternalLink className="w-3 h-3 flex-shrink-0" /><span className="truncate">{hostname}</span>
        </a>
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => del.mutate(item.id)} className="w-6 h-6 rounded-lg bg-background/80 hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors shadow-sm backdrop-blur-sm"><Trash2 className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

function ImageCard({ item, bookId }: { item: ResearchItem; bookId: number }) {
  const del = useDeleteResearchItem(bookId);
  return (
    <div className="relative group rounded-2xl overflow-hidden break-inside-avoid mb-3 bg-muted/20 border border-border/20">
      <img src={item.content} alt={item.title || "Research image"} className="w-full object-cover" style={{ maxHeight: 300 }} />
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => del.mutate(item.id)} className="w-6 h-6 rounded-lg bg-background/80 hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors shadow-sm backdrop-blur-sm"><Trash2 className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

export function ResearchBoard({ bookId }: { bookId: number }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const { data: items = [], isLoading } = useResearchItems(bookId);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "note" | "link" | "image">("all");
  const [search, setSearch] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const filtered = (filter === "all" ? items : items.filter(i => i.type === filter))
    .filter(i => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (i.content || "").toLowerCase().includes(q) || (i.title || "").toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q);
    });

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-lg">{ar ? "لوحة البحث" : "Research Board"}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ar ? "احفظ روابط وملاحظات وصور مرتبطة بكتابك" : "Save links, notes & images related to your book"}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="rounded-xl gap-2 bg-white text-black hover:bg-white/90 transition-all" size="sm">
          <Plus className="w-4 h-4" />{ar ? "إضافة" : "Add"}
        </Button>
      </div>

      {/* Search + Filter row */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[180px] rounded-xl border border-border/40 bg-muted/20 px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={ar ? "بحث..." : "Search notes..."}
            className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-muted-foreground" />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5">
          {([
            { k: "all",   label: ar ? "الكل"    : "All",    count: items.length },
            { k: "note",  label: ar ? "ملاحظات" : "Notes",  count: items.filter(i => i.type === "note").length  },
            { k: "link",  label: ar ? "روابط"   : "Links",  count: items.filter(i => i.type === "link").length  },
            { k: "image", label: ar ? "صور"     : "Images", count: items.filter(i => i.type === "image").length },
          ] as const).map(({ k, label, count }) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filter === k ? "bg-foreground text-background border-foreground" : "bg-transparent text-muted-foreground border-border/40 hover:border-foreground/30 hover:text-foreground"}`}>
              {label}
              {count > 0 && <span className={`text-[10px] font-bold ${filter === k ? "opacity-70" : "opacity-50"}`}>{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Search results count */}
      {search && (
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length} {ar ? "نتيجة" : "result"}{filtered.length !== 1 ? "s" : ""} {ar ? "لـ" : "for"} "{search}"
        </p>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/8 flex items-center justify-center">
            {search ? <Search className="w-8 h-8 text-white/40" /> : <StickyNote className="w-8 h-8 text-white/40" />}
          </div>
          <div>
            <p className="font-semibold text-foreground/70">
              {search ? (ar ? "لا نتائج" : "No results found") : (ar ? "لوحة البحث فارغة" : "Your research board is empty")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? (ar ? "جرب كلمة بحث مختلفة" : "Try a different search term") : (ar ? "ابدأ بإضافة ملاحظة أو رابط أو صورة" : "Start by adding a note, link, or image")}
            </p>
          </div>
          {!search && (
            <Button onClick={() => setShowAdd(true)} variant="outline" className="rounded-xl gap-2 mt-1">
              <Plus className="w-4 h-4" />{ar ? "إضافة أول عنصر" : "Add your first item"}
            </Button>
          )}
        </div>
      )}

      {/* Masonry Grid */}
      {filtered.length > 0 && (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3" style={{ columnFill: "balance" }}>
          {filtered.map(item => {
            if (item.type === "note") return <NoteCard key={item.id} item={item} bookId={bookId} ar={ar} />;
            if (item.type === "link") return <LinkCard key={item.id} item={item} bookId={bookId} ar={ar} />;
            if (item.type === "image") return <ImageCard key={item.id} item={item} bookId={bookId} />;
            return null;
          })}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      )}

      {showAdd && <AddDialog bookId={bookId} onClose={() => setShowAdd(false)} ar={ar} />}
    </div>
  );
}
