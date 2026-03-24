import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadCloud, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function LegacyImporter({ bookId }: { bookId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: async (uploadFile: File) => {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const res = await fetch(`/api/books/${bookId}/legacy-import`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to import file");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/books/${bookId}/chapters`] });
      queryClient.invalidateQueries({ queryKey: [`/api/books/${bookId}/lore`] });
      queryClient.invalidateQueries({ queryKey: [`/api/books/${bookId}/story-beats`] });
      toast({ title: "Import Successful!", description: data.message });
      setFile(null);
    },
    onError: (error: Error) => {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
      setFile(null);
    },
  });

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };

  const processFile = (selectedFile: File) => {
    if (selectedFile.type === "application/pdf" || selectedFile.name.endsWith(".docx")) {
      setFile(selectedFile);
      importMutation.mutate(selectedFile);
    } else {
      toast({ title: "Invalid File Type", description: "Please upload a .pdf or .docx file.", variant: "destructive" });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFile(e.target.files[0]);
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-dashed transition-all duration-200 cursor-pointer group",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border/60 bg-card/30 hover:border-primary/50 hover:bg-primary/[0.03]",
        importMutation.isPending && "pointer-events-none opacity-70"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !importMutation.isPending && fileInputRef.current?.click()}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.docx" className="hidden" />

      <div className="flex items-center gap-4 p-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200",
          isDragging ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        )}>
          {importMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : importMutation.isSuccess ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <UploadCloud className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {importMutation.isPending
              ? "Analyzing Manuscript…"
              : importMutation.isSuccess
              ? "Import Complete"
              : "Import Manuscript"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {importMutation.isPending
              ? "Extracting content and mapping chapters…"
              : importMutation.isSuccess
              ? "Your manuscript has been imported as a chapter"
              : "Drop a .pdf or .docx file here, or click to browse"}
          </p>
        </div>

        {!importMutation.isPending && !importMutation.isSuccess && (
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-primary/70 bg-primary/8 px-2.5 py-1 rounded-full border border-primary/15 flex-shrink-0">
            <FileText className="w-3 h-3" />
            AI Extraction
          </div>
        )}
      </div>
    </div>
  );
}
