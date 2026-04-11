import { useRef, useState, useEffect } from "react";
import { PenTool, RotateCcw, Trash2, CheckCircle2 } from "lucide-react";
import { ReactSketchCanvas, type ReactSketchCanvasRef } from "react-sketch-canvas";

interface DrawingCanvasProps {
  isDark: boolean;
  ar: boolean;
  resolvedBgColor: string | undefined;
  onSaveDrawing: (base64: string) => void;
  onClose: () => void;
}

export function DrawingCanvas({
  isDark,
  ar,
  resolvedBgColor,
  onSaveDrawing,
  onClose,
}: DrawingCanvasProps) {
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const [canvasColor, setCanvasColor] = useState("#000000");
  const [canvasStroke, setCanvasStroke] = useState(4);
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.eraseMode(isEraser);
    }
  }, [isEraser]);

  const handleSave = async () => {
    if (!canvasRef.current) return;
    try {
      const base64 = await canvasRef.current.exportImage("png");
      onSaveDrawing(base64);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className="fixed z-[100] animate-in fade-in duration-150"
      style={{
        top: 96, left: 0, right: 0, bottom: 0,
        background: resolvedBgColor ? `${resolvedBgColor}e8` : isDark ? 'rgba(18,18,22,0.93)' : 'rgba(250,249,246,0.93)',
        backdropFilter: 'blur(2px)',
      }}
    >
      {/* Floating Tools Sidebar */}
      <div
        className="absolute flex flex-col gap-2 p-2 rounded-2xl shadow-2xl z-10"
        style={{
          top: '50%', transform: 'translateY(-50%)',
          left: '16px',
          background: isDark ? 'rgba(28,28,32,0.97)' : 'rgba(255,255,255,0.97)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          width: '52px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        }}
      >
        {/* Pen */}
        <button
          onClick={() => setIsEraser(false)}
          title={ar ? "قلم" : "Pen"}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: !isEraser ? 'hsl(var(--primary))' : 'transparent',
            color: !isEraser ? '#fff' : isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
          }}
        >
          <PenTool className="w-4 h-4" />
        </button>

        {/* Eraser */}
        <button
          onClick={() => setIsEraser(true)}
          title={ar ? "ممحاة" : "Eraser"}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all text-base"
          style={{
            background: isEraser ? 'hsl(var(--primary))' : 'transparent',
            color: isEraser ? '#fff' : isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
          }}
        >
          &#8856;
        </button>

        {/* Divider */}
        <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', margin: '2px 4px' }} />

        {/* Color swatches */}
        {["#000000", "#ffffff", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"].map(c => (
          <button
            key={c}
            onClick={() => { setCanvasColor(c); setIsEraser(false); }}
            title={c}
            className="w-7 h-7 rounded-full self-center transition-all hover:scale-110"
            style={{
              background: c,
              outline: canvasColor === c && !isEraser ? '2px solid hsl(var(--primary))' : '2px solid transparent',
              outlineOffset: '2px',
              boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px rgba(0,0,0,0.2)' : undefined,
            }}
          />
        ))}

        {/* Custom color */}
        <div className="relative self-center" title={ar ? "لون مخصص" : "Custom color"}>
          <div
            className="w-7 h-7 rounded-full border-2"
            style={{
              background: canvasColor,
              borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)',
            }}
          />
          <input
            type="color"
            value={canvasColor}
            onChange={e => { setCanvasColor(e.target.value); setIsEraser(false); }}
            className="absolute inset-0 opacity-0 cursor-pointer rounded-full"
          />
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', margin: '2px 4px' }} />

        {/* Brush size presets */}
        {[2, 5, 12, 24].map(sz => (
          <button
            key={sz}
            onClick={() => setCanvasStroke(sz)}
            title={`${sz}px`}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: canvasStroke === sz ? 'hsl(var(--primary) / 0.12)' : 'transparent',
            }}
          >
            <div
              className="rounded-full"
              style={{
                width: Math.min(sz + 4, 24),
                height: Math.min(sz + 4, 24),
                background: isEraser ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)') : canvasColor,
                border: isEraser ? '1.5px dashed rgba(150,150,150,0.6)' : 'none',
              }}
            />
          </button>
        ))}

        {/* Divider */}
        <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', margin: '2px 4px' }} />

        {/* Undo */}
        <button
          onClick={() => canvasRef.current?.undo()}
          title={ar ? "تراجع" : "Undo"}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}
          onMouseEnter={e => (e.currentTarget.style.color = isDark ? '#fff' : '#000')}
          onMouseLeave={e => (e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)')}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Clear */}
        <button
          onClick={() => canvasRef.current?.clearCanvas()}
          title={ar ? "مسح" : "Clear"}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ color: 'rgba(239,68,68,0.6)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(239,68,68,1)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.6)')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Action Buttons (top-right) */}
      <div className="absolute top-3 right-4 flex items-center gap-2 z-10">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          }}
        >
          {ar ? "إلغاء" : "Cancel"}
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg"
          style={{ background: 'hsl(var(--primary))', color: '#fff' }}
        >
          <CheckCircle2 className="w-4 h-4" />
          {ar ? "إدراج في الصفحة" : "Insert into Page"}
        </button>
      </div>

      {/* Label (top-center) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 pointer-events-none">
        <PenTool className="w-3.5 h-3.5" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }} />
        <span className="text-xs font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }}>
          {ar ? "ارسم على الصفحة" : "Draw on page"}
        </span>
      </div>

      {/* Full-area Drawing Canvas */}
      <div className="absolute inset-0" style={{ cursor: isEraser ? 'cell' : 'crosshair' }}>
        <ReactSketchCanvas
          ref={canvasRef}
          strokeWidth={isEraser ? Math.max(canvasStroke * 2.5, 12) : canvasStroke}
          strokeColor={canvasColor}
          className="w-full h-full border-none"
          canvasColor="transparent"
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  );
}
