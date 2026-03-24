import { useState } from "react";
import { Link } from "wouter";
import { useTrashedBooks, useRestoreBook, useDeleteBook } from "@/hooks/use-books";
import { Layout } from "@/components/layout";
import { BookOpen, Sparkles, RefreshCcw, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ConfirmModal } from "@/components/confirm-modal";

export default function Trash() {
  const { data: trashedBooks, isLoading } = useTrashedBooks();
  const restoreBook = useRestoreBook();
  const deleteBook = useDeleteBook();
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; title: string } | null>(null);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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

      <Layout>
        <div className="max-w-6xl mx-auto py-8">
          <div className="flex items-center gap-4 mb-10">
            <Link href="/" className="p-2 hover:bg-white/5 rounded-full transition-colors mr-2">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-white/80" />
            </div>
            <h1 className="text-3xl font-bold">Recycle Bin</h1>
          </div>

          {!trashedBooks || trashedBooks.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-[2rem] border border-white/10">
              <Trash2 className="w-12 h-12 mx-auto text-white/20 mb-4" />
              <h3 className="text-2xl font-bold mb-2">Trash is empty</h3>
              <p className="text-white/50">Deleted projects will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {trashedBooks.map((book, index) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div className="bg-[#0a0a0a] rounded-2xl overflow-hidden border border-red-500/20 shadow-2xl h-full flex flex-col group relative">
                    <div className="aspect-[2/3] bg-black relative overflow-hidden opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-500">
                      {book.coverImage ? (
                        <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#222] to-[#111]">
                          <BookOpen className="w-10 h-10 text-white/20" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                        <button
                          onClick={() => restoreBook.mutate(book.id)}
                          className="px-6 py-2 bg-white text-black font-semibold rounded-full flex items-center gap-2 hover:scale-105 transition-transform"
                        >
                          <RefreshCcw className="w-4 h-4" />
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: book.id, title: book.title })}
                          className="px-6 py-2 bg-red-500/20 text-red-500 border border-red-500/50 font-semibold rounded-full flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Forever
                        </button>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col pt-3">
                      <h3 className="text-sm font-bold text-white/60 line-clamp-2">{book.title}</h3>
                      <div className="mt-2 text-[10px] text-white/30">
                        Deleted: {book.createdAt ? format(new Date(book.createdAt), "MMM d, yyyy") : "Unknown"}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
