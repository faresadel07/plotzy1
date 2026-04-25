import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTrashedBooks, useRestoreBook, useDeleteBook } from "@/hooks/use-books";
import { Layout } from "@/components/layout";
import { BookOpen, RefreshCcw, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ConfirmModal } from "@/components/confirm-modal";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif';

export default function Trash() {
  const { data: trashedBooks, isLoading } = useTrashedBooks();
  const restoreBook = useRestoreBook();
  const deleteBook = useDeleteBook();
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; title: string } | null>(null);
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <Layout isFullDark>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
        </div>
      </Layout>
    );
  }

  return (
    <>
      <ConfirmModal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) deleteBook.mutate(confirmDelete.id); }}
        title={`Delete "${confirmDelete?.title}"?`}
        message="This is permanent and cannot be undone. The project will be gone forever."
        confirmLabel="Delete Forever"
        variant="danger"
      />

      <Layout isFullDark>
        <div style={{ minHeight: "100vh", background: "#080808", paddingTop: 72, paddingBottom: 60 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(14px, 4vw, 24px)" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 48 }}>
              <button
                onClick={() => navigate("/")}
                style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0,
                  transition: "background 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              >
                <ArrowLeft style={{ width: 14, height: 14, color: "rgba(255,255,255,0.6)" }} />
              </button>
              <div>
                <p style={{ fontFamily: SF, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 2 }}>
                  Workspace
                </p>
                <h1 style={{ fontFamily: SF, fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
                  Recycle Bin
                </h1>
              </div>
            </div>

            {/* Empty */}
            {!trashedBooks || trashedBooks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  textAlign: "center",
                  padding: "80px 24px",
                  border: "1.5px dashed rgba(255,255,255,0.08)",
                  borderRadius: 28,
                  background: "rgba(255,255,255,0.015)",
                }}
              >
                <Trash2 style={{ width: 40, height: 40, margin: "0 auto 16px", color: "rgba(255,255,255,0.12)" }} />
                <p style={{ fontFamily: SF, fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                  Trash is empty
                </p>
                <p style={{ fontFamily: SF, fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
                  Deleted projects will appear here.
                </p>
              </motion.div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 20,
              }}>
                {trashedBooks.map((book, index) => (
                  <motion.div
                    key={book.id}
                    className="trash-card"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    style={{ position: "relative" }}
                  >
                    {/* Portrait card */}
                    <div style={{
                      aspectRatio: "2/3",
                      borderRadius: 14,
                      overflow: "hidden",
                      position: "relative",
                      background: "#111",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      {/* Cover image with gray desaturated filter */}
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            filter: "grayscale(60%) brightness(0.55) sepia(15%)",
                            transition: "filter 0.4s ease",
                          }}
                        />
                      ) : (
                        <div style={{
                          width: "100%", height: "100%",
                          background: "linear-gradient(160deg, #1a1a1a 0%, #0d0d0d 100%)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <BookOpen style={{ width: 28, height: 28, color: "rgba(255,255,255,0.1)" }} />
                        </div>
                      )}

                      {/* Gray overlay (visible by default, hides on hover) */}
                      <div
                        data-dim
                        style={{
                          position: "absolute", inset: 0,
                          background: "rgba(20,18,18,0.4)",
                          transition: "opacity 0.4s ease",
                          pointerEvents: "none",
                          opacity: 1,
                        }}
                      />

                      {/* Hover overlay: actions */}
                      <div
                        data-actions
                        style={{
                          position: "absolute", inset: 0,
                          background: "rgba(0,0,0,0.72)",
                          opacity: 0,
                          transition: "opacity 0.3s ease",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          padding: 12,
                        }}
                      >
                        <button
                          onClick={() => restoreBook.mutate(book.id)}
                          style={{
                            width: "100%",
                            padding: "8px 0",
                            background: "#fff",
                            color: "#111",
                            border: "none",
                            borderRadius: 30,
                            fontFamily: SF,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            transition: "opacity 0.15s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                        >
                          <RefreshCcw style={{ width: 12, height: 12 }} />
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: book.id, title: book.title })}
                          style={{
                            width: "100%",
                            padding: "7px 0",
                            background: "transparent",
                            color: "rgba(255,80,80,0.85)",
                            border: "1px solid rgba(255,80,80,0.35)",
                            borderRadius: 30,
                            fontFamily: SF,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(255,60,60,0.18)";
                            e.currentTarget.style.borderColor = "rgba(255,80,80,0.7)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.borderColor = "rgba(255,80,80,0.35)";
                          }}
                        >
                          <Trash2 style={{ width: 11, height: 11 }} />
                          Delete Forever
                        </button>
                      </div>
                    </div>

                    {/* Title + date below card */}
                    <div style={{ paddingTop: 10 }}>
                      <p style={{
                        fontFamily: SF,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.55)",
                        lineHeight: 1.3,
                        marginBottom: 3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {book.title}
                      </p>
                      <p style={{
                        fontFamily: SF,
                        fontSize: 10,
                        color: "rgba(255,255,255,0.22)",
                      }}>
                        {book.createdAt ? format(new Date(book.createdAt), "MMM d, yyyy") : ""}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

          </div>
        </div>
        {/* Hover state via CSS instead of JS DOM mutation. Replaces the
            previous onMouseEnter/Leave handlers that mutated style on
            three child nodes via querySelector — fragile if React
            re-rendered the card mid-hover (e.g. after a sibling card
            was restored). Pure CSS is also smoother and doesn't
            allocate. */}
        <style>{`
          .trash-card img { transition: filter 0.4s ease; }
          .trash-card:hover img { filter: none !important; }
          .trash-card [data-dim] { transition: opacity 0.4s ease; }
          .trash-card:hover [data-dim] { opacity: 0 !important; }
          .trash-card [data-actions] { transition: opacity 0.3s ease; }
          .trash-card:hover [data-actions] { opacity: 1 !important; }
        `}</style>
      </Layout>
    </>
  );
}
