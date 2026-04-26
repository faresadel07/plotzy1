import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X, Plus, Edit2, Trash2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface LoreEntry {
    id: number;
    bookId: number;
    name: string;
    content: string;
    category: "character" | "location" | "item" | "magic";
}

interface StoryBibleProps {
    bookId: number;
    isOpen: boolean;
    onClose: () => void;
    lang?: string;
}

export function StoryBible({ bookId, isOpen, onClose, lang = "en" }: StoryBibleProps) {
    const [activeTab, setActiveTab] = useState<LoreEntry["category"]>("character");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", content: "" });
    const queryClient = useQueryClient();

    // Backend lore routes are nested under the book — see lib/shared/src/routes.ts.
    // Three of these previously called the wrong path (`/api/lore`, `/api/lore/generate`)
    // which 404'd silently and made Auto-Extract appear to do nothing.
    const { data: lore = [], isLoading } = useQuery<LoreEntry[]>({
        queryKey: ["/api/books", bookId, "lore"],
        queryFn: async () => {
            const res = await fetch(`/api/books/${bookId}/lore`);
            if (!res.ok) throw new Error("Failed to fetch lore");
            return res.json();
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (data: Partial<LoreEntry> & { isNew?: boolean }) => {
            // Construct explicit body so the UI-only `isNew` discriminator
            // and the redundant `id` (already in the PUT URL) don't leak
            // onto the wire. Without this, the server-side Zod schemas
            // for /api/books/:bookId/lore (POST) and /api/lore/:id (PUT)
            // would 400 the moment they get .strict() applied.
            const body = JSON.stringify({
                name: data.name,
                category: data.category,
                content: data.content,
            });
            if (data.isNew) {
                const res = await fetch(`/api/books/${bookId}/lore`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body,
                });
                if (!res.ok) throw new Error("Failed to save");
                return res.json();
            } else {
                const res = await fetch(`/api/lore/${data.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body,
                });
                if (!res.ok) throw new Error("Failed to save");
                return res.json();
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/books", bookId, "lore"] });
            setEditingId(null);
            setIsAdding(false);
            setEditForm({ name: "", content: "" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/lore/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/books", bookId, "lore"] });
        },
    });

    const generateLoreMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/books/${bookId}/lore/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            if (!res.ok) throw new Error("Failed to generate");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/books", bookId, "lore"] });
        },
    });

    const handleSave = (id?: number) => {
        if (!editForm.name.trim()) return;
        if (id) {
            saveMutation.mutate({ id, ...editForm, category: activeTab });
        } else {
            saveMutation.mutate({ isNew: true, name: editForm.name, content: editForm.content, category: activeTab });
        }
    };

    const tabs: { id: LoreEntry["category"], label: string }[] = [
        { id: "character", label: lang === "ar" ? "شخصيات" : "Characters" },
        { id: "location", label: lang === "ar" ? "أماكن" : "Locations" },
        { id: "item", label: lang === "ar" ? "عناصر" : "Items" },
        { id: "magic", label: lang === "ar" ? "سحر" : "Magic" },
    ];

    const filteredLore = lore.filter(l => l.category === activeTab);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    />
                    <motion.div
                        initial={{ x: lang === "ar" ? -400 : 400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: lang === "ar" ? -400 : 400, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className={`fixed top-0 bottom-0 ${lang === "ar" ? "left-0 border-r" : "right-0 border-l"} w-full md:w-[450px] bg-white/95 dark:bg-black/95 backdrop-blur-xl border-border/20 z-50 flex flex-col shadow-2xl`}
                        dir={lang === "ar" ? "rtl" : "ltr"}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-border/20 flex items-center justify-between bg-foreground/[0.03]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-foreground/10 border border-border/30 flex items-center justify-center shadow-sm">
                                    <BookOpen className="w-5 h-5 text-foreground" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-lg text-foreground tracking-wide">Story Bible</h2>
                                    <p className="text-xs text-muted-foreground">Contextual Lore Tracker</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground hover:bg-foreground/8 rounded-xl">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* AI Extraction Button */}
                        <div className="p-4 border-b border-border/20 bg-foreground/[0.02]">
                            <Button
                                onClick={() => generateLoreMutation.mutate()}
                                disabled={generateLoreMutation.isPending}
                                className="w-full bg-foreground hover:bg-foreground/90 text-background rounded-xl border-0 font-semibold h-11 transition-all hover:scale-[1.02]"
                            >
                                {generateLoreMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {lang === "ar" ? "يستخرج..." : "Extracting from chapters..."}</>
                                ) : (
                                    <><Sparkles className="w-4 h-4 mr-2" /> {lang === "ar" ? "استخراج المعرفة تلقائياً" : "Auto-Extract from Chapters"}</>
                                )}
                            </Button>
                            <p className="text-[10px] text-center mt-2 text-muted-foreground">
                                {lang === "ar" ? "يقوم الذكاء بتغطية أحدث الفصول لتسجيل الشخصيات والأماكن." : "AI scans your latest chapters to record new entities."}
                            </p>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-4 py-3 gap-2 overflow-x-auto no-scrollbar border-b border-border/20">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveTab(tab.id); setIsAdding(false); setEditingId(null); }}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab.id
                                            ? "bg-foreground text-background shadow-sm"
                                            : "bg-foreground/8 text-muted-foreground hover:text-foreground hover:bg-foreground/15"
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {isLoading ? (
                                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                            ) : filteredLore.length === 0 && !isAdding ? (
                                <div className="text-center p-8 text-muted-foreground flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full bg-foreground/8 flex items-center justify-center mb-3">
                                        <BookOpen className="w-5 h-5 opacity-50" />
                                    </div>
                                    <p className="text-sm">{lang === "ar" ? "لا توجد حقول مسجلة في هذا القسم. استخدم الذكاء لاستخراجها أو أضف يدوياً." : "No entries here. Use AI extraction or add manually."}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredLore.map(entry => (
                                        <div key={entry.id} className="bg-card border border-border/30 rounded-xl p-4 transition-all hover:border-border/60 group relative overflow-hidden">
                                            {editingId === entry.id ? (
                                                <div className="space-y-3">
                                                    <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-background border-border/50 font-bold h-9" />
                                                    <Textarea value={editForm.content} onChange={e => setEditForm({ ...editForm, content: e.target.value })} className="bg-background border-border/50 text-sm h-24 text-muted-foreground resize-none" />
                                                    <div className="flex gap-2 justify-end">
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 text-muted-foreground hover:text-foreground">Cancel</Button>
                                                        <Button size="sm" onClick={() => handleSave(entry.id)} className="h-8 bg-foreground hover:bg-foreground/90 text-background" disabled={saveMutation.isPending}>
                                                            {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mx-2" /> : "Save"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-foreground/8" onClick={() => { setEditingId(entry.id); setEditForm({ name: entry.name, content: entry.content }); }}>
                                                            <Edit2 className="w-3 h-3" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate(entry.id)}>
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                    <h3 className="font-bold text-foreground text-base mb-1 pr-16">{entry.name}</h3>
                                                    <p className="text-sm text-muted-foreground leading-relaxed">{entry.content}</p>
                                                </>
                                            )}
                                        </div>
                                    ))}

                                    {isAdding && (
                                        <div className="bg-card border-2 border-dashed border-border/50 rounded-xl p-4 animate-in fade-in slide-in-from-top-4">
                                            <div className="space-y-3">
                                                <Input autoFocus placeholder="Name..." value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-background border-border/50 font-bold h-9" />
                                                <Textarea placeholder="Description..." value={editForm.content} onChange={e => setEditForm({ ...editForm, content: e.target.value })} className="bg-background border-border/50 text-sm h-24 text-muted-foreground resize-none" />
                                                <div className="flex gap-2 justify-end mt-2">
                                                    <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="h-8 text-muted-foreground hover:text-foreground">Cancel</Button>
                                                    <Button size="sm" onClick={() => handleSave()} className="h-8 bg-foreground hover:bg-foreground/90 text-background" disabled={saveMutation.isPending}>
                                                        {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mx-2" /> : "Add Entry"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!isAdding && (
                                        <Button onClick={() => { setIsAdding(true); setEditForm({ name: "", content: "" }); setEditingId(null); }} variant="outline" className="w-full h-12 border-dashed border-border/40 text-muted-foreground hover:text-foreground hover:border-border/70 hover:bg-foreground/5 rounded-xl">
                                            <Plus className="w-4 h-4 mr-2" /> Add New
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
