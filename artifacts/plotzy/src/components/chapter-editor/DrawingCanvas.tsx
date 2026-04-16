import { useRef, useState, useEffect, useCallback } from "react";
import { PenTool, Eraser, RotateCcw, RotateCw, Trash2, CheckCircle2 } from "lucide-react";

interface DrawingCanvasProps {
  isDark: boolean;
  ar: boolean;
  resolvedBgColor: string | undefined;
  onSaveDrawing: (base64: string) => void;
  onClose: () => void;
}

interface Point { x: number; y: number; pressure: number }
interface Stroke {
  points: Point[];
  color: string;
  width: number;
  isEraser: boolean;
}

const COLORS = [
  "#000000", "#374151", "#ffffff",
  "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
];

const SIZES = [2, 5, 12, 24];

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length === 0) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (stroke.isEraser) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
  }

  const pts = stroke.points;
  if (pts.length === 1) {
    ctx.beginPath();
    const r = stroke.width * (pts[0].pressure || 0.5) * 0.5;
    ctx.arc(pts[0].x, pts[0].y, Math.max(r, 0.5), 0, Math.PI * 2);
    ctx.fillStyle = stroke.isEraser ? "rgba(0,0,0,1)" : stroke.color;
    if (stroke.isEraser) ctx.globalCompositeOperation = "destination-out";
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const curr = pts[i];
      ctx.lineWidth = stroke.width * (0.4 + (curr.pressure || 0.5) * 0.6);
      if (i < pts.length - 1) {
        const next = pts[i + 1];
        const midX = (curr.x + next.x) / 2;
        const midY = (curr.y + next.y) / 2;
        ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
      } else {
        ctx.lineTo(curr.x, curr.y);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function DrawingCanvas({
  isDark,
  ar,
  resolvedBgColor,
  onSaveDrawing,
  onClose,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const currentStroke = useRef<Stroke | null>(null);
  const isDrawing = useRef(false);

  /* ─── Canvas sizing ─── */
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    setupCanvas();
    const onResize = () => { setupCanvas(); redrawAll(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setupCanvas]);

  /* ─── Redraw ─── */
  const redrawAll = useCallback((extra?: Stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    const all = extra ? [...strokes, extra] : strokes;
    for (const s of all) drawStroke(ctx, s);
  }, [strokes]);

  useEffect(() => { redrawAll(); }, [strokes, redrawAll]);

  /* ─── Pointer events ─── */
  const getPos = (e: React.PointerEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, pressure: e.pressure > 0 ? e.pressure : 0.5 };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const pt = getPos(e);
    currentStroke.current = {
      points: [pt],
      color: strokeColor,
      width: isEraser ? Math.max(strokeWidth * 2.5, 16) : strokeWidth,
      isEraser,
    };
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) { redrawAll(); drawStroke(ctx, currentStroke.current); }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current || !currentStroke.current) return;
    e.preventDefault();
    currentStroke.current.points.push(getPos(e));
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) redrawAll(currentStroke.current);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDrawing.current || !currentStroke.current) return;
    e.preventDefault();
    isDrawing.current = false;
    if (currentStroke.current.points.length > 0) {
      setStrokes(prev => [...prev, currentStroke.current!]);
      setRedoStack([]);
    }
    currentStroke.current = null;
  };

  const undo = () => {
    setStrokes(prev => {
      if (!prev.length) return prev;
      setRedoStack(r => [prev[prev.length - 1], ...r]);
      return prev.slice(0, -1);
    });
  };
  const redo = () => {
    setRedoStack(prev => {
      if (!prev.length) return prev;
      setStrokes(s => [...s, prev[0]]);
      return prev.slice(1);
    });
  };
  const clearAll = () => {
    if (!strokes.length) return;
    setRedoStack([...strokes].reverse());
    setStrokes([]);
  };

  /* ─── Export ─── */
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const exp = document.createElement("canvas");
    exp.width = w * 2;
    exp.height = h * 2;
    const ctx = exp.getContext("2d")!;
    ctx.scale(2, 2);
    for (const s of strokes) drawStroke(ctx, s);
    onSaveDrawing(exp.toDataURL("image/png"));
  };

  const bg = resolvedBgColor || (isDark ? "#121216" : "#faf9f6");
  const panelBg = isDark ? "#1c1c20" : "#ffffff";
  const panelBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: `${bg}f0`, backdropFilter: "blur(4px)" }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-3 h-11 flex-shrink-0" style={{ background: panelBg, borderBottom: `1px solid ${panelBorder}` }}>
        <div className="flex items-center gap-2">
          <PenTool className="w-3.5 h-3.5" style={{ color: muted }} />
          <span className="text-xs font-medium" style={{ color: muted }}>
            {ar ? "وضع الرسم" : "Drawing Mode"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)", color: muted, border: `1px solid ${panelBorder}` }}>
            {ar ? "إلغاء" : "Cancel"}
          </button>
          <button onClick={handleSave} disabled={strokes.length === 0} className="flex items-center gap-1.5 px-4 py-1 rounded-lg text-xs font-semibold shadow disabled:opacity-40" style={{ background: "hsl(var(--primary))", color: "#fff" }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {ar ? "إدراج في الصفحة" : "Insert into Page"}
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Toolbar ── */}
        <div className="flex flex-col items-center gap-1 py-2 px-1 overflow-y-auto flex-shrink-0" style={{ width: 52, background: panelBg, borderRight: `1px solid ${panelBorder}` }}>

          {/* Pen */}
          <button onClick={() => setIsEraser(false)} title={ar ? "قلم" : "Pen"} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{ background: !isEraser ? "hsl(var(--primary))" : "transparent", color: !isEraser ? "#fff" : muted }}>
            <PenTool className="w-4 h-4" />
          </button>

          {/* Eraser */}
          <button onClick={() => setIsEraser(true)} title={ar ? "ممحاة" : "Eraser"} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{ background: isEraser ? "hsl(var(--primary))" : "transparent", color: isEraser ? "#fff" : muted }}>
            <Eraser className="w-4 h-4" />
          </button>

          <div className="w-6 my-0.5" style={{ height: 1, background: panelBorder }} />

          {/* Colors */}
          {COLORS.map(c => (
            <button key={c} onClick={() => { setStrokeColor(c); setIsEraser(false); }} className="w-6 h-6 rounded-full transition-all hover:scale-110 flex-shrink-0" style={{ background: c, outline: strokeColor === c && !isEraser ? "2.5px solid hsl(var(--primary))" : "2px solid transparent", outlineOffset: 2, boxShadow: c === "#ffffff" ? "inset 0 0 0 1.5px rgba(0,0,0,0.15)" : undefined }} />
          ))}

          {/* Custom */}
          <div className="relative flex-shrink-0">
            <div className="w-6 h-6 rounded-full" style={{ background: "conic-gradient(red,yellow,lime,aqua,blue,magenta,red)", border: `1.5px solid ${panelBorder}` }} />
            <input type="color" value={strokeColor} onChange={e => { setStrokeColor(e.target.value); setIsEraser(false); }} className="absolute inset-0 opacity-0 cursor-pointer rounded-full" />
          </div>

          <div className="w-6 my-0.5" style={{ height: 1, background: panelBorder }} />

          {/* Sizes */}
          {SIZES.map(sz => (
            <button key={sz} onClick={() => setStrokeWidth(sz)} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0" style={{ background: strokeWidth === sz ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)") : "transparent" }}>
              <div className="rounded-full" style={{ width: Math.min(sz * 1.2 + 4, 26), height: Math.min(sz * 1.2 + 4, 26), background: isEraser ? muted : strokeColor, border: isEraser ? "1.5px dashed rgba(150,150,150,0.6)" : "none", boxShadow: strokeColor === "#ffffff" && !isEraser ? "inset 0 0 0 1px rgba(0,0,0,0.15)" : undefined }} />
            </button>
          ))}

          <div className="w-6 my-0.5" style={{ height: 1, background: panelBorder }} />

          {/* Undo */}
          <button onClick={undo} disabled={strokes.length === 0} title={ar ? "تراجع" : "Undo"} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-25" style={{ color: muted }}>
            <RotateCcw className="w-4 h-4" />
          </button>
          {/* Redo */}
          <button onClick={redo} disabled={redoStack.length === 0} title={ar ? "إعادة" : "Redo"} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-25" style={{ color: muted }}>
            <RotateCw className="w-4 h-4" />
          </button>
          {/* Clear */}
          <button onClick={clearAll} disabled={strokes.length === 0} title={ar ? "مسح الكل" : "Clear All"} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-25" style={{ color: "rgba(239,68,68,0.6)" }}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* ── Canvas ── */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 touch-none"
            style={{ cursor: "crosshair" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onContextMenu={e => e.preventDefault()}
          />
          {strokes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ color: muted, opacity: 0.3 }}>
              <div className="flex flex-col items-center gap-2">
                <PenTool className="w-10 h-10" />
                <p className="text-sm font-medium">{ar ? "ابدأ الرسم هنا..." : "Start drawing here..."}</p>
                <p className="text-xs">{ar ? "يدعم القلم والماوس واللمس" : "Supports pen, mouse & touch"}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
