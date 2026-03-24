import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/language-context";
import { Printer, X, Maximize2, Minimize2, RefreshCw, Download } from "lucide-react";

const PAGE_SIZES = [
  { value: "classic", label: "Classic (6×9)" },
  { value: "modern",  label: "Modern (6×9)" },
  { value: "minimal", label: "Minimal (A5)" },
];

interface PrintPreviewProps {
  bookId: number;
  bookTitle: string;
  onClose: () => void;
}

export function PrintPreviewModal({ bookId, bookTitle, onClose }: PrintPreviewProps) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [template, setTemplate] = useState("classic");
  const [fullscreen, setFullscreen] = useState(false);
  const [key, setKey] = useState(0);

  const previewUrl = `/api/books/${bookId}/download?format=pdf&template=${template}&preview=1`;
  const downloadUrl = `/api/books/${bookId}/download?format=pdf&template=${template}`;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-background ${fullscreen ? "" : "p-4 sm:p-8"}`}>
      {/* Header */}
      <div className={`flex items-center justify-between gap-3 mb-3 ${fullscreen ? "px-4 pt-3" : ""}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Printer className="w-4 h-4 text-primary flex-shrink-0" />
          <h2 className="font-bold text-sm truncate">{ar ? "معاينة الطباعة" : "Print Preview"} — {bookTitle}</h2>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Template selector */}
          <Select value={template} onValueChange={v => { setTemplate(v); setKey(k => k + 1); }}>
            <SelectTrigger className="h-8 w-36 text-xs rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map(s => (
                <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-xl" onClick={() => setKey(k => k + 1)} title={ar ? "تحديث" : "Refresh"}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>

          {/* Download */}
          <a href={downloadUrl} download>
            <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" />
              {ar ? "تحميل PDF" : "Download PDF"}
            </Button>
          </a>

          {/* Fullscreen toggle */}
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-xl" onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>

          {/* Close */}
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-xl" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview iframe */}
      <div className={`flex-1 rounded-xl overflow-hidden border border-border/30 bg-muted/10 ${fullscreen ? "mx-4 mb-4" : ""}`}>
        <iframe
          key={key}
          src={previewUrl}
          className="w-full h-full"
          title={ar ? "معاينة الكتاب" : "Book Preview"}
        />
      </div>
    </div>
  );
}

export function PrintPreviewButton({ bookId, bookTitle }: { bookId: number; bookTitle: string }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <PrintPreviewModal bookId={bookId} bookTitle={bookTitle} onClose={() => setOpen(false)} />}
      <Button
        size="sm"
        variant="outline"
        className="rounded-xl gap-1.5 flex-shrink-0 whitespace-nowrap"
        onClick={() => setOpen(true)}
      >
        <Printer className="w-3.5 h-3.5" />
        {ar ? "معاينة" : "Preview"}
      </Button>
    </>
  );
}
