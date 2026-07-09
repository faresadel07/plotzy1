import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X, Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// The Story Bible is fully manual by Faris's decision: the writer
// records characters, places and the rest of their world themselves.
// Built-in sections cover what most books need; writers can add their
// own sections too (stored as free-text categories, plus a local list
// so an empty custom section survives a reload).

interface LoreEntry {
    id: number;
    bookId: number;
    name: string;
    content: string;
    category: string;
}

interface StoryBibleProps {
    bookId: number;
    isOpen: boolean;
    onClose: () => void;
    lang?: string;
}

const HAND = "'Caveat', 'Aref Ruqaa', 'Segoe Script', cursive";
const SERIF = "'Lora', 'Amiri', Georgia, serif";

const BUILTIN_SECTIONS: { id: string; en: string; ar: string }[] = [
    { id: "character", en: "Characters", ar: "شخصيات" },
    { id: "location", en: "Locations", ar: "أماكن" },
    { id: "item", en: "Items", ar: "عناصر" },
    { id: "magic", en: "Magic", ar: "سحر" },
    { id: "event", en: "Events", ar: "أحداث" },
    { id: "note", en: "Notes", ar: "ملاحظات" },
];

function sectionsStorageKey(bookId: number) {
    return `plotzy-bible-sections-${bookId}`;
}

export function StoryBible({ bookId, isOpen, onClose, lang = "en" }: StoryBibleProps) {
    const [activeTab, setActiveTab] = useState<string>("character");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", content: "" });
    const [addingSection, setAddingSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState("");
    const [customSections, setCustomSections] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem(sectionsStorageKey(bookId)) || "[]"); }
        catch { return []; }
    });
    const queryClient = useQueryClient();
    const isAr = lang === "ar";

    // Backend lore routes are nested under the book — see lib/shared/src/routes.ts.
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
            // onto the wire and trip the server-side Zod .strict() schemas.
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

    const handleSave = (id?: number) => {
        if (!editForm.name.trim()) return;
        if (id) {
            saveMutation.mutate({ id, ...editForm, category: activeTab });
        } else {
            saveMutation.mutate({ isNew: true, name: editForm.name, content: editForm.content, category: activeTab });
        }
    };

    // Sections = built-ins + locally saved customs + any category that
    // already exists in the data (covers customs created on another device).
    const builtinIds = BUILTIN_SECTIONS.map(s => s.id);
    const derivedCustoms = Array.from(new Set([
        ...customSections,
        ...lore.map(l => l.category).filter(c => !builtinIds.includes(c)),
    ]));
    const persistCustoms = (next: string[]) => {
        setCustomSections(next);
        try { localStorage.setItem(sectionsStorageKey(bookId), JSON.stringify(next)); } catch { }
    };
    const handleAddSection = () => {
        const name = newSectionName.trim();
        if (!name) return;
        if (!builtinIds.includes(name) && !derivedCustoms.includes(name)) {
            persistCustoms([...derivedCustoms, name]);
        }
        setActiveTab(name);
        setNewSectionName("");
        setAddingSection(false);
        setIsAdding(false);
        setEditingId(null);
    };
    const handleRemoveCustomSection = (name: string) => {
        // Only offered when the section is empty, so nothing is lost.
        persistCustoms(derivedCustoms.filter(s => s !== name));
        if (activeTab === name) setActiveTab("character");
    };

    const filteredLore = lore.filter(l => l.category === activeTab);
    const activeIsCustom = !builtinIds.includes(activeTab);

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
                        className={`fixed top-0 bottom-0 ${lang === "ar" ? "left-0 border-r" : "right-0 border-l"} w-full md:w-[450px] bg-[#f7f2e4]/95 backdrop-blur-xl border-[#423521]/15 z-50 flex flex-col shadow-2xl`}
                        dir={lang === "ar" ? "rtl" : "ltr"}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-[#423521]/15 flex items-center justify-between bg-[#292115]/[0.03]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#292115]/10 border border-[#423521]/20 flex items-center justify-center shadow-sm">
                                    <BookOpen className="w-5 h-5 text-[#2f2618]" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-lg text-[#2f2618] tracking-wide" style={{ fontFamily: SERIF }}>
                                        {isAr ? "دليل القصة" : "Story Bible"}
                                    </h2>
                                    <p className="text-[#8a8070]" style={{ fontFamily: HAND, fontSize: isAr ? 13 : 15, transform: "rotate(-1deg)" }}>
                                        {isAr ? "(دفتر عالمك الصغير)" : "(your world's little notebook)"}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} className="text-[#7b7366] hover:text-[#2f2618] hover:bg-[#292115]/8 rounded-xl">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Tabs: built-in sections, the writer's own sections,
                            and the add-a-section control */}
                        <div className="flex px-4 py-3 gap-2 overflow-x-auto no-scrollbar border-b border-[#423521]/15 items-center">
                            {BUILTIN_SECTIONS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveTab(tab.id); setIsAdding(false); setEditingId(null); setAddingSection(false); }}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab.id
                                            ? "bg-[#292115] text-[#f7f2e4] shadow-sm"
                                            : "bg-[#292115]/8 text-[#7b7366] hover:text-[#2f2618] hover:bg-[#292115]/15"
                                        }`}
                                >
                                    {isAr ? tab.ar : tab.en}
                                </button>
                            ))}
                            {derivedCustoms.map((name) => (
                                <button
                                    key={name}
                                    onClick={() => { setActiveTab(name); setIsAdding(false); setEditingId(null); setAddingSection(false); }}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === name
                                            ? "bg-[#292115] text-[#f7f2e4] shadow-sm"
                                            : "bg-[#292115]/8 text-[#7b7366] hover:text-[#2f2618] hover:bg-[#292115]/15"
                                        }`}
                                >
                                    {name}
                                </button>
                            ))}
                            {addingSection ? (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <Input
                                        autoFocus
                                        value={newSectionName}
                                        onChange={e => setNewSectionName(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter") handleAddSection(); if (e.key === "Escape") setAddingSection(false); }}
                                        placeholder={isAr ? "اسم القسم" : "Section name"}
                                        className="h-8 w-32 text-xs bg-[#fffdf7] border-[#423521]/25"
                                    />
                                    <button onClick={handleAddSection} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#292115] text-[#f7f2e4]">
                                        {isAr ? "أضف" : "Add"}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setAddingSection(true); setNewSectionName(""); }}
                                    className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border border-dashed border-[#423521]/30 text-[#7b7366] hover:text-[#2f2618] hover:border-[#423521]/50 transition-all flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" />
                                    {isAr ? "قسم جديد" : "New section"}
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {isLoading ? (
                                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[#7b7366]" /></div>
                            ) : filteredLore.length === 0 && !isAdding ? (
                                <div className="text-center p-8 text-[#7b7366] flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full bg-[#292115]/8 flex items-center justify-center mb-3">
                                        <BookOpen className="w-5 h-5 opacity-50" />
                                    </div>
                                    <p style={{ fontFamily: HAND, fontSize: isAr ? 15 : 18, color: "#8a8070", transform: "rotate(-1deg)" }}>
                                        {isAr ? "(ما في شي هون بعد، أضف أول عنصر)" : "(nothing here yet, add your first entry)"}
                                    </p>
                                    {activeIsCustom && (
                                        <button
                                            onClick={() => handleRemoveCustomSection(activeTab)}
                                            className="mt-3 text-[11px] text-[#9a9181] hover:text-[#b3402e] underline underline-offset-2"
                                        >
                                            {isAr ? "حذف هذا القسم" : "Remove this section"}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredLore.map(entry => (
                                        <div key={entry.id} className="bg-[#fffdf7] border border-[#423521]/15 rounded-xl p-4 transition-all hover:border-[#423521]/35 group relative overflow-hidden">
                                            {editingId === entry.id ? (
                                                <div className="space-y-3">
                                                    <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-[#f7f2e4] border-[#423521]/25 font-bold h-9" />
                                                    <Textarea value={editForm.content} onChange={e => setEditForm({ ...editForm, content: e.target.value })} className="bg-[#f7f2e4] border-[#423521]/25 text-sm h-24 text-[#5c5142] resize-none" />
                                                    <div className="flex gap-2 justify-end">
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 text-[#7b7366] hover:text-[#2f2618]">{isAr ? "إلغاء" : "Cancel"}</Button>
                                                        <Button size="sm" onClick={() => handleSave(entry.id)} className="h-8 bg-[#292115] hover:bg-[#292115]/90 text-[#f7f2e4]" disabled={saveMutation.isPending}>
                                                            {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mx-2" /> : (isAr ? "حفظ" : "Save")}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className={`absolute top-2 ${isAr ? "left-2" : "right-2"} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-[#7b7366] hover:text-[#2f2618] hover:bg-[#292115]/8" onClick={() => { setEditingId(entry.id); setEditForm({ name: entry.name, content: entry.content }); }}>
                                                            <Edit2 className="w-3 h-3" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-[#b3402e] hover:text-[#b3402e] hover:bg-[#b3402e]/10" onClick={() => deleteMutation.mutate(entry.id)}>
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                    <h3 className="font-bold text-[#2f2618] text-base mb-1 pe-16" style={{ fontFamily: SERIF }}>{entry.name}</h3>
                                                    <p className="text-sm text-[#5c5142] leading-relaxed">{entry.content}</p>
                                                </>
                                            )}
                                        </div>
                                    ))}

                                    {isAdding && (
                                        <div className="bg-[#fffdf7] border-2 border-dashed border-[#423521]/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-4">
                                            <div className="space-y-3">
                                                <Input autoFocus placeholder={isAr ? "الاسم..." : "Name..."} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-[#f7f2e4] border-[#423521]/25 font-bold h-9" />
                                                <Textarea placeholder={isAr ? "الوصف..." : "Description..."} value={editForm.content} onChange={e => setEditForm({ ...editForm, content: e.target.value })} className="bg-[#f7f2e4] border-[#423521]/25 text-sm h-24 text-[#5c5142] resize-none" />
                                                <div className="flex gap-2 justify-end mt-2">
                                                    <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="h-8 text-[#7b7366] hover:text-[#2f2618]">{isAr ? "إلغاء" : "Cancel"}</Button>
                                                    <Button size="sm" onClick={() => handleSave()} className="h-8 bg-[#292115] hover:bg-[#292115]/90 text-[#f7f2e4]" disabled={saveMutation.isPending}>
                                                        {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mx-2" /> : (isAr ? "إضافة" : "Add Entry")}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!isAdding && (
                                        <Button onClick={() => { setIsAdding(true); setEditForm({ name: "", content: "" }); setEditingId(null); }} variant="outline" className="w-full h-12 border-dashed border-[#423521]/30 text-[#7b7366] hover:text-[#2f2618] hover:border-[#423521]/50 hover:bg-[#292115]/5 rounded-xl bg-transparent">
                                            <Plus className="w-4 h-4 me-2" /> {isAr ? "إضافة جديد" : "Add New"}
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
