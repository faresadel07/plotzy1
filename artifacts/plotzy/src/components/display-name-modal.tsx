import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

interface DisplayNameModalProps {
  open: boolean;
  onDone: () => void;
}

export function DisplayNameModal({ open, onDone }: DisplayNameModalProps) {
  const { lang } = useLanguage();
  const { refetch } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const ar = lang === "ar";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/auth/display-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      await refetch();
      onDone();
      toast({
        title: ar ? "مرحباً بك!" : `Welcome, ${name.trim()}!`,
      });
    } catch {
      toast({ title: ar ? "فشل الحفظ" : "Could not save name", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-sm rounded-2xl"
        dir={ar ? "rtl" : "ltr"}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            {ar ? "اختر اسمك" : "Choose your display name"}
          </DialogTitle>
        </DialogHeader>

        <DialogDescription className="text-sm text-muted-foreground text-center -mt-2 mb-4">
          {ar
            ? "هذا هو الاسم الذي سيراه القراء في Plotzy."
            : "This is the name readers will see on Plotzy."}
        </DialogDescription>

        <form onSubmit={handleSave}>
          <Input
            placeholder={ar ? "مثال: أحمد الكاتب" : "e.g. Jane Doe"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border-border focus:border-primary/60 text-base mb-4"
            autoFocus
            maxLength={50}
            dir={ar ? "rtl" : "ltr"}
            data-testid="input-display-name"
          />
          <DialogFooter>
            <Button
              type="submit"
              disabled={saving || !name.trim()}
              className="w-full rounded-xl font-bold bg-primary hover:bg-primary/90 text-white h-11"
              data-testid="button-save-display-name"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{ar ? "جارٍ الحفظ..." : "Saving..."}</>
                : ar ? "ابدأ الكتابة" : "Start Writing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
