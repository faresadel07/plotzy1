import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useQuery, useMutation } from "@tanstack/react-query";
import { StoryBeat } from "@/shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, GripVertical, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface OutlineBoardProps {
    bookId: number;
}

const ACTS = [
    { id: "act1", title: "Act I: Setup",          color: "#111111" },
    { id: "act2", title: "Act II: Confrontation", color: "#555555" },
    { id: "act3", title: "Act III: Resolution",   color: "#444444" },
];

export default function OutlineBoard({ bookId }: OutlineBoardProps) {
    const { toast } = useToast();
    const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const { data: beats = [], isLoading } = useQuery<StoryBeat[]>({
        queryKey: [`/api/books/${bookId}/story-beats`],
    });

    const createMutation = useMutation({
        mutationFn: async (beat: Partial<StoryBeat>) => {
            const res = await fetch(`/api/books/${bookId}/story-beats`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(beat),
            });
            if (!res.ok) throw new Error("Failed to create beat");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/books/${bookId}/story-beats`] });
            setAddingToColumn(null);
            setNewTitle("");
            setNewDescription("");
        },
        onError: () => toast({ variant: "destructive", title: "Failed to create beat" }),
    });

    const reorderMutation = useMutation({
        mutationFn: async (updates: { id: number; columnId: string; order: number }[]) => {
            const res = await fetch(`/api/books/${bookId}/story-beats/reorder`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates }),
            });
            if (!res.ok) throw new Error("Failed to reorder beats");
            return res.json();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/story-beats/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete beat");
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/books/${bookId}/story-beats`] }),
        onError: () => toast({ variant: "destructive", title: "Failed to delete beat" }),
    });

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newBeats = Array.from(beats);
        const movedBeat = newBeats.find(b => b.id.toString() === draggableId.replace("beat-", ""));
        if (!movedBeat) return;

        const sourceColBeats = newBeats.filter(b => b.columnId === source.droppableId).sort((a, b) => a.order - b.order);
        sourceColBeats.splice(source.index, 1);

        const destColBeats = newBeats.filter(b => b.columnId === destination.droppableId && b.id !== movedBeat.id).sort((a, b) => a.order - b.order);
        destColBeats.splice(destination.index, 0, { ...movedBeat, columnId: destination.droppableId });

        const updates: { id: number; columnId: string; order: number }[] = [];
        if (source.droppableId !== destination.droppableId) {
            sourceColBeats.forEach((beat, i) => updates.push({ id: beat.id, columnId: beat.columnId, order: i }));
        }
        destColBeats.forEach((beat, i) => updates.push({ id: beat.id, columnId: destination.droppableId, order: i }));

        queryClient.setQueryData([`/api/books/${bookId}/story-beats`], (old: StoryBeat[] | undefined) => {
            if (!old) return old;
            return old.map(b => {
                const update = updates.find(u => u.id === b.id);
                return update ? { ...b, columnId: update.columnId, order: update.order } : b;
            });
        });

        reorderMutation.mutate(updates);
    };

    const handleAddSubmit = (columnId: string) => {
        if (!newTitle.trim()) return;
        const order = beats.filter(b => b.columnId === columnId).length;
        createMutation.mutate({ title: newTitle, description: newDescription, columnId, order });
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex flex-col gap-5">
                {ACTS.map(act => {
                    const actBeats = beats.filter(b => b.columnId === act.id).sort((a, b) => a.order - b.order);
                    const isCollapsed = collapsed[act.id];

                    return (
                        <div
                            key={act.id}
                            className="rounded-xl border border-border bg-card/40 overflow-hidden"
                            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                        >
                            {/* Act Header */}
                            <div
                                className="flex items-center justify-between px-5 py-4 border-b border-border cursor-pointer select-none"
                                style={{ background: `linear-gradient(90deg, ${act.color}10 0%, transparent 60%)` }}
                                onClick={() => setCollapsed(c => ({ ...c, [act.id]: !c[act.id] }))}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ background: act.color }}
                                    />
                                    <h3 className="font-semibold text-base text-foreground">{act.title}</h3>
                                    <span
                                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                                        style={{
                                            background: `${act.color}18`,
                                            color: act.color,
                                            border: `1px solid ${act.color}30`,
                                        }}
                                    >
                                        {actBeats.length} {actBeats.length === 1 ? "beat" : "beats"}
                                    </span>
                                </div>
                                {isCollapsed
                                    ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    : <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                }
                            </div>

                            {/* Act Body */}
                            {!isCollapsed && (
                                <div className="p-4">
                                    <Droppable droppableId={act.id} direction="vertical">
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`flex flex-col gap-2.5 min-h-[60px] rounded-lg transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : ""}`}
                                            >
                                                {actBeats.length === 0 && !snapshot.isDraggingOver && (
                                                    <div className="flex items-center justify-center h-14 rounded-lg border border-dashed border-border text-sm text-muted-foreground/60">
                                                        No beats yet — add one below
                                                    </div>
                                                )}

                                                {actBeats.map((beat, index) => (
                                                    <Draggable key={`beat-${beat.id}`} draggableId={`beat-${beat.id}`} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                className={`group relative rounded-lg border bg-card p-4 transition-all ${
                                                                    snapshot.isDragging
                                                                        ? "border-primary/50 shadow-lg ring-1 ring-primary/30 scale-[1.01] opacity-95"
                                                                        : "border-border hover:border-border/80 hover:shadow-sm"
                                                                }`}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <div
                                                                        {...provided.dragHandleProps}
                                                                        className="mt-0.5 flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing"
                                                                    >
                                                                        <GripVertical className="h-4 w-4" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <h4 className="font-medium text-sm text-foreground leading-snug">
                                                                                {beat.title}
                                                                            </h4>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 -mr-1 -mt-1 text-muted-foreground hover:text-destructive"
                                                                                onClick={() => deleteMutation.mutate(beat.id)}
                                                                            >
                                                                                <Trash2 className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>
                                                                        {beat.description && (
                                                                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">
                                                                                {beat.description}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}

                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>

                                    {/* Add Beat */}
                                    {addingToColumn === act.id ? (
                                        <div className="mt-3 rounded-lg border border-border bg-background p-4 space-y-3">
                                            <Input
                                                autoFocus
                                                placeholder="Beat title (e.g. The Call to Adventure)"
                                                value={newTitle}
                                                onChange={e => setNewTitle(e.target.value)}
                                                onKeyDown={e => e.key === "Enter" && handleAddSubmit(act.id)}
                                                className="text-sm"
                                            />
                                            <Textarea
                                                placeholder="Brief description of what happens in this beat…"
                                                value={newDescription}
                                                onChange={e => setNewDescription(e.target.value)}
                                                className="text-xs min-h-[72px] resize-none"
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs"
                                                    onClick={() => {
                                                        setAddingToColumn(null);
                                                        setNewTitle("");
                                                        setNewDescription("");
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="text-xs font-semibold text-background border-0"
                                                    style={{ background: "#111111" }}
                                                    onClick={() => handleAddSubmit(act.id)}
                                                    disabled={!newTitle.trim() || createMutation.isPending}
                                                >
                                                    Save Beat
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setAddingToColumn(act.id)}
                                            className="mt-3 w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-accent/30 transition-all"
                                        >
                                            <Plus className="h-4 w-4 flex-shrink-0" />
                                            Add Beat
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </DragDropContext>
    );
}
