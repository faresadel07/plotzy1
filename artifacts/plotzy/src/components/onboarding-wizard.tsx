import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Sparkles, Feather, Loader2, Wand2, Rocket, ArrowRight, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";

const GENRES = [
    { id: "fantasy", label: "Fantasy", icon: "✨" },
    { id: "scifi", label: "Sci-Fi", icon: "🚀" },
    { id: "romance", label: "Romance", icon: "💖" },
    { id: "mystery", label: "Mystery", icon: "🔍" },
    { id: "thriller", label: "Thriller", icon: "🔪" },
    { id: "historical", label: "Historical", icon: "🏛️" },
    { id: "nonfiction", label: "Non-Fiction", icon: "📚" },
    { id: "other", label: "Other", icon: "✏️" },
];

export function OnboardingWizard({
    open,
    onClose,
    onCreateBook
}: {
    open: boolean;
    onClose: () => void;
    onCreateBook: (data: { title: string; summary: string; authorName: string; genre: string; protagonist: string }) => Promise<void>;
}) {
    const { t, lang, isRTL } = useLanguage();
    const [step, setStep] = useState(1);
    const [title, setTitle] = useState("");
    const [authorName, setAuthorName] = useState("");
    const [genre, setGenre] = useState("");
    const [protagonist, setProtagonist] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    // Reset state when opened
    useEffect(() => {
        if (open) {
            setStep(1);
            setTitle("");
            setAuthorName("");
            setGenre("");
            setProtagonist("");
        }
    }, [open]);

    const handleNext = () => setStep((s) => Math.min(s + 1, 3));
    const handleBack = () => setStep((s) => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        if (!title.trim() || !genre) {
            toast({
                variant: "destructive",
                title: lang === "ar" ? "معلومات ناقصة" : "Missing Information",
                description: lang === "ar" ? "يرجى التأكد من اختيار عنوان ونوع أدبي لقصتك." : "Please make sure you have entered a title and selected a genre.",
            });
            return;
        }
        setIsSubmitting(true);
        try {
            // Build a smart summary out of the genre and protagonist data for the AI to use later
            const smartSummary = `A ${genre} story featuring ${protagonist}.`;
            await onCreateBook({ title, summary: smartSummary, authorName, genre, protagonist });
            onClose();
        } catch (err) {
            console.error("Failed to create book:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const stepVariants = {
        hidden: { opacity: 0, x: isRTL ? -20 : 20, scale: 0.95 },
        visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
        exit: { opacity: 0, x: isRTL ? 20 : -20, scale: 0.95, transition: { duration: 0.2 } }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent
                className="sm:max-w-2xl rounded-[2rem] p-0 border-0 shadow-2xl overflow-hidden bg-transparent"
                dir={isRTL ? "rtl" : "ltr"}
            >
                <div className="bg-card/95 backdrop-blur-xl w-full h-full flex flex-col md:flex-row relative">

                    {/* Left Panel: Aesthetic branding */}
                    <div className="hidden md:flex flex-col justify-between w-1/3 p-8 bg-gradient-to-br from-primary to-accent text-primary-foreground relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                        {/* Decorative particles */}
                        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-20 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10">
                            <BookOpen className="w-10 h-10 mb-4 opacity-90" />
                            <h2 className="text-2xl font-bold leading-tight mb-2">
                                {lang === "ar" ? "ابدأ رحلتك" : "Begin Your Journey"}
                            </h2>
                            <p className="text-sm opacity-80 leading-relaxed text-balance">
                                {lang === "ar"
                                    ? "دعنا نجهز مساحة العمل الخاصة بك. ثلاث خطوات بسيطة وتكون جاهزاً للكتابة."
                                    : "Let's set up your writing studio. Three simple steps and you'll be ready to create magic."}
                            </p>
                        </div>

                        <div className="relative z-10 flex gap-1.5 w-full">
                            {[1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${step >= s ? "bg-white" : "bg-white/30"}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Interactive Form */}
                    <div className="flex-1 p-8 md:p-10 flex flex-col min-h-[480px]">
                        <AnimatePresence mode="wait">
                            {/* STEP 1: Title & Author */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex-1 flex flex-col justify-center space-y-6"
                                >
                                    <div>
                                        <h3 className="text-2xl font-bold text-foreground mb-2">
                                            {lang === "ar" ? "ما هو عنوان تحفتك؟" : "What's the title of your masterpiece?"}
                                        </h3>
                                        <p className="text-muted-foreground text-sm">
                                            {lang === "ar" ? "يمكنك تغييره لاحقاً" : "Don't worry, you can always change it later."}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-foreground/80">{t("storyTitle")}</label>
                                            <Input
                                                placeholder={t("storyTitlePlaceholder")}
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                className="text-lg py-6 rounded-xl border-border bg-background focus:ring-primary/20 transition-all"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-foreground/80">{t("authorName")}</label>
                                            <Input
                                                placeholder={t("authorNamePlaceholder")}
                                                value={authorName}
                                                onChange={(e) => setAuthorName(e.target.value)}
                                                className="py-5 rounded-xl border-border bg-background"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 2: Genre Selection */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex-1 flex flex-col justify-center space-y-6"
                                >
                                    <div>
                                        <h3 className="text-2xl font-bold text-foreground mb-2">
                                            {lang === "ar" ? "اختر النوع الأدبي" : "Choose your genre."}
                                        </h3>
                                        <p className="text-muted-foreground text-sm">
                                            {lang === "ar" ? "هذا يساعد الذكاء الاصطناعي في تصميم غلافك." : "This helps our AI design your perfect book cover."}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {GENRES.map(g => (
                                            <button
                                                key={g.id}
                                                onClick={() => setGenre(g.id)}
                                                className={`p-4 rounded-xl border flex items-center gap-3 transition-all duration-200 text-left cursor-pointer
                          ${genre === g.id
                                                        ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-sm"
                                                        : "border-border hover:border-primary/40 hover:bg-muted"
                                                    }
                        `}
                                            >
                                                <span className="text-2xl">{g.icon}</span>
                                                <span className={`font-medium ${genre === g.id ? "text-primary font-bold" : "text-foreground"}`}>
                                                    {g.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3: Protagonist details for AI Prompting */}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex-1 flex flex-col justify-center space-y-6"
                                >
                                    <div>
                                        <h3 className="text-2xl font-bold text-foreground mb-2">
                                            {lang === "ar" ? "من هو البطل؟" : "Who is your protagonist?"}
                                        </h3>
                                        <p className="text-muted-foreground text-sm">
                                            {lang === "ar" ? "صف بطل قصتك باختصار. سنستخدم هذا لإنشاء الغلاف الأولي." : "Describe your main character briefly. We'll use this to spark your AI cover art (optional)."}
                                        </p>
                                    </div>

                                    <div className="relative">
                                        <Textarea
                                            placeholder={lang === "ar" ? "مثال: محارب شاب بعيون فضية رمادية ونظرة حازمة..." : "e.g., A young warrior with silver-grey eyes and a determined look..."}
                                            value={protagonist}
                                            onChange={(e) => setProtagonist(e.target.value)}
                                            className="resize-none rounded-xl border-border focus:border-primary/60 text-base p-4 min-h-[160px] bg-background"
                                            autoFocus
                                        />
                                        <Sparkles className="absolute bottom-4 right-4 w-5 h-5 text-primary/40 pointer-events-none" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Bottom Navigation */}
                        <div className="mt-8 flex items-center justify-between pt-4 border-t border-border/50">
                            {step > 1 ? (
                                <Button variant="ghost" className="rounded-xl text-muted-foreground hover:text-foreground" onClick={handleBack}>
                                    {isRTL ? <ArrowRight className="w-4 h-4 mr-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
                                    {lang === "ar" ? "رجوع" : "Back"}
                                </Button>
                            ) : (
                                <Button variant="ghost" className="rounded-xl text-muted-foreground opacity-0 pointer-events-none">
                                    Back
                                </Button>
                            )}

                            {step < 3 ? (
                                <Button
                                    onClick={handleNext}
                                    disabled={step === 1 && !title.trim() || step === 2 && !genre}
                                    className="rounded-xl bg-foreground hover:bg-foreground/90 text-background px-8 shadow-md"
                                >
                                    {lang === "ar" ? "التالي" : "Continue"}
                                    {isRTL ? <ArrowLeft className="w-4 h-4 ml-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !title.trim() || !genre}
                                    className="rounded-xl btn-glow bg-primary hover:bg-primary/95 text-white font-bold px-8"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{lang === "ar" ? "جارٍ الإنشاء..." : "Crafting Magic..."}</>
                                    ) : (
                                        <><Wand2 className="w-4 h-4 mr-2" />{lang === "ar" ? "إنشاء الكتاب" : "Start Writing"}</>
                                    )}
                                </Button>
                            )}
                        </div>

                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
