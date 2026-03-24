import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "warning",
}: ConfirmModalProps) {
  const isDanger = variant === "danger";

  const icon = isDanger ? (
    <Trash2 className="w-6 h-6" style={{ color: "#ef4444" }} />
  ) : (
    <AlertTriangle className="w-6 h-6" style={{ color: "rgba(255,255,255,0.80)" }} />
  );

  const iconRing = isDanger
    ? "rgba(239,68,68,0.15)"
    : "rgba(255,255,255,0.06)";

  const iconBorder = isDanger
    ? "rgba(239,68,68,0.30)"
    : "rgba(255,255,255,0.12)";

  const confirmBg = isDanger
    ? "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)"
    : "#111111";

  const confirmBorder = isDanger ? "#ef4444" : "rgba(255,255,255,0.20)";
  const confirmColor = isDanger ? "#fca5a5" : "#EFEFEF";
  const confirmHoverShadow = isDanger
    ? "0 6px 30px rgba(239,68,68,0.40)"
    : "0 6px 30px rgba(0,0,0,0.50)";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              zIndex: 99990,
            }}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              zIndex: 99999,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                background: "#0e0e0e",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20,
                width: "100%",
                maxWidth: 420,
                boxShadow: "0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
                overflow: "hidden",
                pointerEvents: "auto",
              }}
            >
              {/* Top accent line */}
              <div
                style={{
                  height: 2,
                  background: isDanger
                    ? "linear-gradient(90deg, transparent, #ef4444, transparent)"
                    : "linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent)",
                }}
              />

              <div style={{ padding: "28px 28px 24px" }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
                  {/* Icon */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: iconRing,
                      border: `1px solid ${iconBorder}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </div>

                  {/* Title + message */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 17,
                        fontWeight: 700,
                        color: "#ffffff",
                        lineHeight: 1.3,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {title}
                    </h2>
                    <p
                      style={{
                        margin: "8px 0 0",
                        fontSize: 14,
                        color: "rgba(255,255,255,0.50)",
                        lineHeight: 1.55,
                      }}
                    >
                      {message}
                    </p>
                  </div>

                  {/* Close X */}
                  <button
                    onClick={onClose}
                    style={{
                      flexShrink: 0,
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.40)",
                      transition: "background 0.15s, color 0.15s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.10)";
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.80)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.40)";
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Divider */}
                <div
                  style={{
                    height: 1,
                    background: "rgba(255,255,255,0.06)",
                    marginBottom: 20,
                  }}
                />

                {/* Buttons */}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  {/* Cancel */}
                  <button
                    onClick={onClose}
                    style={{
                      flex: 1,
                      padding: "11px 20px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "rgba(255,255,255,0.65)",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "background 0.15s, color 0.15s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)";
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.90)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)";
                    }}
                  >
                    Cancel
                  </button>

                  {/* Confirm */}
                  <button
                    onClick={() => { onConfirm(); onClose(); }}
                    style={{
                      flex: 1,
                      padding: "11px 20px",
                      borderRadius: 12,
                      background: confirmBg,
                      border: `1.5px solid ${confirmBorder}`,
                      color: confirmColor,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = confirmHoverShadow;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                    }}
                  >
                    {confirmLabel}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
