import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Trash2, Unlock, Link2, Link2Off } from "lucide-react";

export interface FloatingImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  locked: boolean;
  aspectRatio: number;
}

type HandleDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface Props {
  images: FloatingImage[];
  pageWidth: number;
  pageHeight: number;
  zoom: number;
  onUpdate: (images: FloatingImage[]) => void;
  ar?: boolean;
}

const HANDLE_POSITIONS: Record<HandleDir, React.CSSProperties> = {
  nw: { top: -5, left: -5, cursor: "nw-resize" },
  n:  { top: -5, left: "50%", transform: "translateX(-50%)", cursor: "n-resize" },
  ne: { top: -5, right: -5, cursor: "ne-resize" },
  e:  { top: "50%", right: -5, transform: "translateY(-50%)", cursor: "e-resize" },
  se: { bottom: -5, right: -5, cursor: "se-resize" },
  s:  { bottom: -5, left: "50%", transform: "translateX(-50%)", cursor: "s-resize" },
  sw: { bottom: -5, left: -5, cursor: "sw-resize" },
  w:  { top: "50%", left: -5, transform: "translateY(-50%)", cursor: "w-resize" },
};

export function FloatingImageOverlay({ images, pageWidth, pageHeight, zoom, onUpdate, ar }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkedAspect, setLinkedAspect] = useState(true);

  const dragRef = useRef<{
    type: "move" | "resize";
    imageId: string;
    handle?: HandleDir;
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    aspectRatio: number;
  } | null>(null);

  const scale = zoom / 100;

  const updateImage = useCallback(
    (id: string, updates: Partial<FloatingImage>) => {
      onUpdate(images.map((img) => (img.id === id ? { ...img, ...updates } : img)));
    },
    [images, onUpdate],
  );

  const deleteImage = useCallback(
    (id: string) => {
      onUpdate(images.filter((img) => img.id !== id));
      setSelectedId(null);
    },
    [images, onUpdate],
  );

  const startDrag = useCallback(
    (
      e: React.MouseEvent,
      imageId: string,
      type: "move" | "resize",
      handle?: HandleDir,
    ) => {
      const img = images.find((i) => i.id === imageId);
      if (!img || img.locked) return;
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        type,
        imageId,
        handle,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startX: img.x,
        startY: img.y,
        startW: img.width,
        startH: img.height,
        aspectRatio: img.aspectRatio || img.width / img.height,
      };
    },
    [images],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;

      const dx = (e.clientX - d.startMouseX) / scale;
      const dy = (e.clientY - d.startMouseY) / scale;

      if (d.type === "move") {
        const newX = Math.max(0, Math.min(pageWidth - d.startW, d.startX + dx));
        const newY = Math.max(0, Math.min(pageHeight - d.startH, d.startY + dy));
        updateImage(d.imageId, { x: Math.round(newX), y: Math.round(newY) });
        return;
      }

      if (!d.handle) return;
      const h = d.handle;
      let newX = d.startX;
      let newY = d.startY;
      let newW = d.startW;
      let newH = d.startH;

      if (h.includes("e")) newW = Math.max(50, d.startW + dx);
      if (h.includes("s")) newH = Math.max(50, d.startH + dy);
      if (h.includes("w")) {
        newW = Math.max(50, d.startW - dx);
        newX = d.startX + d.startW - newW;
      }
      if (h.includes("n")) {
        newH = Math.max(50, d.startH - dy);
        newY = d.startY + d.startH - newH;
      }

      // Maintain aspect ratio on corners
      if (h.length === 2 && d.aspectRatio > 0) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          newH = newW / d.aspectRatio;
          if (h.includes("n")) newY = d.startY + d.startH - newH;
        } else {
          newW = newH * d.aspectRatio;
          if (h.includes("w")) newX = d.startX + d.startW - newW;
        }
      }

      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      newW = Math.min(newW, pageWidth - newX);
      newH = Math.min(newH, pageHeight - newY);

      updateImage(d.imageId, {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      });
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [scale, pageWidth, pageHeight, updateImage]);

  const selectedImg = images.find((i) => i.id === selectedId);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setSelectedId(null);
      }}
    >
      {images.map((img) => {
        const isSel = selectedId === img.id;
        return (
          <div
            key={img.id}
            style={{
              position: "absolute",
              left: img.x,
              top: img.y,
              width: img.width,
              height: img.height,
              pointerEvents: "all",
              cursor: img.locked ? "default" : "move",
              outline: isSel
                ? "2px solid #7c6af7"
                : "2px solid transparent",
              outlineOffset: 1,
              userSelect: "none",
              boxSizing: "border-box",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(img.id);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setSelectedId(img.id);
              startDrag(e, img.id, "move");
            }}
          >
            <img
              src={img.src}
              alt=""
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "fill",
                display: "block",
                pointerEvents: "none",
              }}
            />

            {/* Lock badge */}
            {img.locked && (
              <div
                style={{
                  position: "absolute",
                  bottom: 4,
                  right: 4,
                  background: "rgba(0,0,0,0.55)",
                  borderRadius: 4,
                  padding: "2px 5px",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Lock size={9} color="white" />
              </div>
            )}

            {isSel && (
              <>
                {/* ── Toolbar ── */}
                <div
                  style={{
                    position: "absolute",
                    top: -48,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    background: "#1a1a2e",
                    borderRadius: 10,
                    padding: "5px 10px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
                    whiteSpace: "nowrap",
                    pointerEvents: "all",
                    zIndex: 20,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <ToolbarBtn
                    onClick={(e) => {
                      e.stopPropagation();
                      updateImage(img.id, { locked: !img.locked });
                    }}
                    title={img.locked ? (ar ? "فك القفل" : "Unlock") : (ar ? "قفل" : "Lock")}
                  >
                    {img.locked ? (
                      <Unlock size={13} color="white" />
                    ) : (
                      <Lock size={13} color="white" />
                    )}
                    <span style={{ color: "white", fontSize: 11, marginLeft: 3 }}>
                      {img.locked ? (ar ? "فك" : "Unlock") : (ar ? "قفل" : "Lock")}
                    </span>
                  </ToolbarBtn>

                  <Divider />

                  <ToolbarBtn
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteImage(img.id);
                    }}
                    title={ar ? "حذف" : "Delete"}
                  >
                    <Trash2 size={13} color="#ef4444" />
                    <span style={{ color: "#ef4444", fontSize: 11, marginLeft: 3 }}>
                      {ar ? "حذف" : "Delete"}
                    </span>
                  </ToolbarBtn>
                </div>

                {/* ── Dimension inputs ── */}
                <div
                  style={{
                    position: "absolute",
                    bottom: -46,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "#1a1a2e",
                    borderRadius: 8,
                    padding: "4px 8px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
                    pointerEvents: "all",
                    zIndex: 20,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <DimInput
                    label="W"
                    value={img.width}
                    disabled={img.locked}
                    onChange={(val) => {
                      const newW = Math.max(20, val);
                      if (linkedAspect && img.aspectRatio > 0) {
                        updateImage(img.id, { width: newW, height: Math.round(newW / img.aspectRatio) });
                      } else {
                        updateImage(img.id, { width: newW });
                      }
                    }}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); setLinkedAspect((v) => !v); }}
                    style={{ color: linkedAspect ? "#7c6af7" : "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}
                    title={linkedAspect ? "Unlink aspect ratio" : "Link aspect ratio"}
                  >
                    {linkedAspect ? <Link2 size={11} /> : <Link2Off size={11} />}
                  </button>
                  <DimInput
                    label="H"
                    value={img.height}
                    disabled={img.locked}
                    onChange={(val) => {
                      const newH = Math.max(20, val);
                      if (linkedAspect && img.aspectRatio > 0) {
                        updateImage(img.id, { height: newH, width: Math.round(newH * img.aspectRatio) });
                      } else {
                        updateImage(img.id, { height: newH });
                      }
                    }}
                  />
                </div>

                {/* ── 8 Resize handles ── */}
                {!img.locked &&
                  (["nw", "n", "ne", "e", "se", "s", "sw", "w"] as HandleDir[]).map(
                    (dir) => {
                      const isCorner = dir.length === 2;
                      return (
                        <div
                          key={dir}
                          style={{
                            position: "absolute",
                            width: isCorner ? 10 : 8,
                            height: isCorner ? 10 : 8,
                            background: "#fff",
                            border: "2px solid #7c6af7",
                            borderRadius: isCorner ? 2 : "50%",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                            zIndex: 15,
                            pointerEvents: "all",
                            ...HANDLE_POSITIONS[dir],
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            startDrag(e, img.id, "resize", dir);
                          }}
                        />
                      );
                    },
                  )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "2px 4px",
        borderRadius: 4,
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 16,
        background: "rgba(255,255,255,0.15)",
        margin: "0 4px",
      }}
    />
  );
}

function DimInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>{label}</span>
      <input
        type="number"
        min={20}
        max={2000}
        value={Math.round(value)}
        disabled={disabled}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onChange(v);
        }}
        style={{
          width: 50,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 4,
          color: "white",
          fontSize: 11,
          padding: "1px 4px",
          textAlign: "center",
          outline: "none",
          opacity: disabled ? 0.4 : 1,
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9 }}>px</span>
    </div>
  );
}
