import { useState, useEffect, useRef } from "react";
import { MessageSquarePlus, X, Trash2, Check, Send, WifiOff } from "lucide-react";
import {
  useBookInlineComments, useAddInlineComment,
  useDeleteInlineComment, useResolveInlineComment,
  type InlineComment,
} from "@/hooks/use-public-library";
import { useToast } from "@/hooks/use-toast";
import { textOffsetFromCaret, caretFromTextOffset, assertOffsetsConsistent } from "@/lib/text-offsets";

interface Props {
  bookId: number;
  chapterRefs: Map<number, HTMLElement>;
  chapterIds: number[];
  onFirstSelection?: () => void;
}

/* ─── DOM ─── */

function findChapterContainer(node: Node): HTMLElement | null {
  let cur: Node | null = node;
  while (cur) {
    if (cur instanceof HTMLElement && cur.classList.contains("book-reader-content") && cur.dataset.chapterId) return cur;
    cur = cur.parentNode;
  }
  return null;
}

function caretAtPoint(x: number, y: number): { node: Node; offset: number } | null {
  if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    return r ? { node: r.startContainer, offset: r.startOffset } : null;
  }
  if ((document as any).caretPositionFromPoint) {
    const p = (document as any).caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, offset: p.offset } : null;
  }
  return null;
}

/* ─── Stored-comment highlights ─── */

const HL_CLASS = "inline-comment-highlight";

function clearStoredHighlights() {
  document.querySelectorAll(`.${HL_CLASS}`).forEach(mark => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });
}

function applyStoredHighlight(container: HTMLElement, start: number, end: number, commentId: number) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let acc = 0;
  const segs: { node: Text; from: number; to: number }[] = [];
  let n: Text | null;
  while ((n = walker.nextNode() as Text | null)) {
    const len = n.data.length;
    const ns = acc, ne = acc + len;
    acc = ne;
    if (ne <= start) continue;
    if (ns >= end) break;
    segs.push({ node: n, from: Math.max(0, start - ns), to: Math.min(len, end - ns) });
  }
  for (let i = segs.length - 1; i >= 0; i--) {
    try {
      const r = document.createRange();
      r.setStart(segs[i].node, segs[i].from);
      r.setEnd(segs[i].node, segs[i].to);
      const mark = document.createElement("mark");
      mark.className = HL_CLASS;
      mark.dataset.commentId = String(commentId);
      r.surroundContents(mark);
    } catch { /* skip */ }
  }
}

function renderStoredHighlights(comments: InlineComment[]) {
  clearStoredHighlights();
  const grouped = new Map<number, InlineComment[]>();
  for (const c of comments) {
    if (!grouped.has(c.chapterId)) grouped.set(c.chapterId, []);
    grouped.get(c.chapterId)!.push(c);
  }
  for (const [chapterId, list] of grouped) {
    document.querySelectorAll<HTMLElement>(`.book-reader-content[data-chapter-id="${chapterId}"]`).forEach(el => {
      const sorted = [...list].sort((a, b) => b.startOffset - a.startOffset);
      for (const c of sorted) applyStoredHighlight(el, c.startOffset, c.endOffset, c.id);
    });
  }
}

/* ─── Live selection highlight overlay ─── */

function buildSelectionRects(
  container: HTMLElement, startOff: number, endOff: number
): DOMRect[] {
  const startPos = caretFromTextOffset(container, startOff);
  const endPos = caretFromTextOffset(container, endOff);
  if (!startPos || !endPos) return [];
  try {
    const range = document.createRange();
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);
    return Array.from(range.getClientRects());
  } catch {
    return [];
  }
}

/* ─── Component ─── */

export function InlineCommentsLayer({ bookId, onFirstSelection }: Props) {
  const { data: comments = [], isError: backendOffline } = useBookInlineComments(bookId);
  const addComment = useAddInlineComment();
  const deleteComment = useDeleteInlineComment();
  const resolveComment = useResolveInlineComment();
  const { toast } = useToast();

  const [selectionInfo, setSelectionInfo] = useState<{
    text: string; chapterId: number; startOffset: number; endOffset: number;
    container: HTMLElement;
  } | null>(null);
  const [activeComment, setActiveComment] = useState<{ comment: InlineComment; rect: DOMRect } | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liveRects, setLiveRects] = useState<DOMRect[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Drag state (refs for performance — no re-render during drag)
  const dragging = useRef(false);
  const anchorContainer = useRef<HTMLElement | null>(null);
  const anchorChapterId = useRef(0);
  const anchorOffset = useRef(0);
  const currentStart = useRef(0);
  const currentEnd = useRef(0);

  // ── Render stored highlights ──
  useEffect(() => {
    const t = setTimeout(() => renderStoredHighlights(comments), 200);
    return () => clearTimeout(t);
  }, [comments]);

  // ── Click on stored highlight ──
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest?.(`.${HL_CLASS}`) as HTMLElement | null;
      if (!target) return;
      const cid = Number(target.dataset.commentId);
      const comment = comments.find(c => c.id === cid);
      if (!comment) return;
      e.stopPropagation();
      e.preventDefault();
      setActiveComment({ comment, rect: target.getBoundingClientRect() });
      setSelectionInfo(null);
      setLiveRects([]);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [comments]);

  // ── Pointer handlers: custom selection ──

  function startDrag(x: number, y: number, target: Node) {
    const container = findChapterContainer(target);
    if (!container) return;
    const caret = caretAtPoint(x, y);
    if (!caret || !container.contains(caret.node)) return;
    const off = textOffsetFromCaret(container, caret.node, caret.offset);
    if (off < 0) return;

    dragging.current = true;
    anchorContainer.current = container;
    anchorChapterId.current = Number(container.dataset.chapterId);
    anchorOffset.current = off;
    currentStart.current = off;
    currentEnd.current = off;

    // Clear previous
    setSelectionInfo(null);
    setActiveComment(null);
    setLiveRects([]);
    // Kill any native selection
    window.getSelection()?.removeAllRanges();
  }

  function moveDrag(x: number, y: number) {
    if (!dragging.current || !anchorContainer.current) return;
    const caret = caretAtPoint(x, y);
    if (!caret || !anchorContainer.current.contains(caret.node)) return;
    const off = textOffsetFromCaret(anchorContainer.current, caret.node, caret.offset);
    if (off < 0) return;

    const a = anchorOffset.current;
    const start = Math.min(a, off);
    const end = Math.max(a, off);
    currentStart.current = start;
    currentEnd.current = end;

    // Render live highlight rects
    if (end - start >= 3) {
      const rects = buildSelectionRects(anchorContainer.current, start, end);
      setLiveRects(rects);
    } else {
      setLiveRects([]);
    }

    // Kill native selection continuously
    window.getSelection()?.removeAllRanges();
  }

  function endDrag() {
    if (!dragging.current || !anchorContainer.current) return;
    dragging.current = false;

    const container = anchorContainer.current;
    const start = currentStart.current;
    const end = currentEnd.current;

    if (end - start < 3) {
      setLiveRects([]);
      return;
    }

    const fullText = container.textContent || "";
    const selectedText = fullText.slice(start, end).trim();
    if (selectedText.length < 3) {
      setLiveRects([]);
      return;
    }

    assertOffsetsConsistent(container, start);
    assertOffsetsConsistent(container, end);

    setSelectionInfo({ text: selectedText, chapterId: anchorChapterId.current, startOffset: start, endOffset: end, container });
    onFirstSelection?.();
    setNewComment("");
  }

  // ── Mouse events ──
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (layerRef.current?.contains(e.target as Node)) return;
      if ((e.target as HTMLElement).closest?.(`.${HL_CLASS}`)) return;
      // Close popovers
      if (selectionInfo || activeComment) {
        setSelectionInfo(null);
        setActiveComment(null);
        setLiveRects([]);
      }
      startDrag(e.clientX, e.clientY, e.target as Node);
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      moveDrag(e.clientX, e.clientY);
    };
    const onUp = (_e: MouseEvent) => {
      if (!dragging.current) return;
      endDrag();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [selectionInfo, activeComment]);

  // ── Touch events ──
  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (layerRef.current?.contains(e.target as Node)) return;
      if ((e.target as HTMLElement).closest?.(`.${HL_CLASS}`)) return;
      const t = e.touches[0];
      if (!t) return;
      startDrag(t.clientX, t.clientY, e.target as Node);
    };
    const onMoveT = (e: TouchEvent) => {
      if (!dragging.current) return;
      const t = e.touches[0];
      if (!t) return;
      e.preventDefault();
      moveDrag(t.clientX, t.clientY);
    };
    const onEnd = (_e: TouchEvent) => {
      if (!dragging.current) return;
      endDrag();
    };
    document.addEventListener("touchstart", onStart, { passive: false });
    document.addEventListener("touchmove", onMoveT, { passive: false });
    document.addEventListener("touchend", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMoveT);
      document.removeEventListener("touchend", onEnd);
    };
  }, [selectionInfo, activeComment]);

  // ── Escape ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSelectionInfo(null); setActiveComment(null); setLiveRects([]); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ── Auto-focus textarea ──
  useEffect(() => {
    if (selectionInfo) setTimeout(() => inputRef.current?.focus(), 50);
  }, [selectionInfo]);

  // ── Submit ──
  const handleSubmit = async () => {
    if (!selectionInfo || !newComment.trim()) return;
    setSubmitting(true);
    try {
      await addComment.mutateAsync({
        bookId,
        chapterId: selectionInfo.chapterId,
        selectedText: selectionInfo.text,
        startOffset: selectionInfo.startOffset,
        endOffset: selectionInfo.endOffset,
        content: newComment.trim(),
      });
      toast({ title: "Comment added!" });
      setSelectionInfo(null);
      setLiveRects([]);
      setNewComment("");
    } catch (err: any) {
      toast({ title: err?.message || "Failed to save — is the server running?", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Popover position from live rects ──
  const popoverRect = (() => {
    if (selectionInfo && liveRects.length > 0) {
      const last = liveRects[liveRects.length - 1];
      return last;
    }
    if (activeComment) return activeComment.rect;
    return null;
  })();

  const computePos = (rect: DOMRect) => {
    const W = 320, H = 220;
    let left = rect.left + rect.width / 2 - W / 2;
    let top = rect.bottom + 10;
    if (left < 12) left = 12;
    if (left + W > window.innerWidth - 12) left = window.innerWidth - W - 12;
    if (top + H > window.innerHeight - 12) top = rect.top - H - 10;
    return { left, top };
  };

  // ── Backend offline banner ──
  if (backendOffline) {
    return (
      <div style={{
        position: "fixed", bottom: 16, right: 16, zIndex: 99999,
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(220,38,38,0.9)", color: "#fff",
        padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}>
        <WifiOff style={{ width: 14, height: 14 }} />
        Comments unavailable — server offline
      </div>
    );
  }

  const showNew = selectionInfo !== null;
  const showExisting = activeComment !== null;
  const showPopover = showNew || showExisting;

  return (
    <>
      {/* ── Live selection highlight overlay ── */}
      {liveRects.length > 0 && (
        <div ref={overlayRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 99998 }}>
          {liveRects.map((r, i) => (
            <div key={i} style={{
              position: "fixed",
              left: r.left, top: r.top,
              width: r.width, height: r.height,
              background: "rgba(250, 204, 21, 0.3)",
              borderRadius: 2,
              pointerEvents: "none",
            }} />
          ))}
        </div>
      )}

      {/* ── Popover ── */}
      {showPopover && popoverRect && (
        <div ref={layerRef} style={{ position: "fixed", zIndex: 99999, ...computePos(popoverRect), width: 320 }} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div style={{
            background: "#1a1a1d", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16,
            boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)", overflow: "hidden",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
          }}>
            {showNew && (
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <MessageSquarePlus style={{ width: 14, height: 14, color: "rgba(250,204,21,0.8)" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Add Comment</span>
                  </div>
                  <button onClick={() => { setSelectionInfo(null); setLiveRects([]); }} aria-label="Cancel" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "rgba(255,255,255,0.3)" }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>

                <div style={{ background: "rgba(250,204,21,0.08)", borderLeft: "3px solid rgba(250,204,21,0.4)", borderRadius: "0 8px 8px 0", padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, maxHeight: 60, overflow: "hidden", fontStyle: "italic" }}>
                  &ldquo;{selectionInfo!.text.length > 120 ? selectionInfo!.text.slice(0, 120) + "..." : selectionInfo!.text}&rdquo;
                </div>

                <textarea ref={inputRef} value={newComment} onChange={e => setNewComment(e.target.value)}
                  placeholder="Write your comment..." rows={3}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
                  style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 13, lineHeight: 1.5, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{navigator.platform.includes("Mac") ? "\u2318" : "Ctrl"}+Enter</span>
                  <button onClick={handleSubmit} disabled={submitting || !newComment.trim()}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8,
                      background: newComment.trim() ? "rgba(250,204,21,0.9)" : "rgba(255,255,255,0.06)",
                      color: newComment.trim() ? "#000" : "rgba(255,255,255,0.3)",
                      fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                      opacity: submitting ? 0.5 : 1, transition: "all 0.15s",
                    }}>
                    <Send style={{ width: 12, height: 12 }} />
                    {submitting ? "Posting..." : "Comment"}
                  </button>
                </div>
              </div>
            )}

            {showExisting && activeComment && (
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {activeComment.comment.authorAvatarUrl ? (
                      <img src={activeComment.comment.authorAvatarUrl} alt={activeComment.comment.authorName || ""} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(250,204,21,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "rgba(250,204,21,0.8)" }}>
                        {activeComment.comment.authorName[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{activeComment.comment.authorName}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                        {new Date(activeComment.comment.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setActiveComment(null)} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "rgba(255,255,255,0.3)" }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>

                <div style={{ background: "rgba(250,204,21,0.08)", borderLeft: "3px solid rgba(250,204,21,0.4)", borderRadius: "0 8px 8px 0", padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, maxHeight: 48, overflow: "hidden", fontStyle: "italic" }}>
                  &ldquo;{activeComment.comment.selectedText.length > 80 ? activeComment.comment.selectedText.slice(0, 80) + "..." : activeComment.comment.selectedText}&rdquo;
                </div>

                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, marginBottom: 12 }}>
                  {activeComment.comment.content}
                </div>

                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button onClick={() => { resolveComment.mutate({ bookId, commentId: activeComment.comment.id }); setActiveComment(null); }}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, background: "rgba(34,197,94,0.12)", color: "rgba(34,197,94,0.8)", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer" }}>
                    <Check style={{ width: 12, height: 12 }} /> Resolve
                  </button>
                  <button onClick={() => { deleteComment.mutate({ bookId, commentId: activeComment.comment.id }); setActiveComment(null); }}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "rgba(239,68,68,0.7)", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer" }}>
                    <Trash2 style={{ width: 12, height: 12 }} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
