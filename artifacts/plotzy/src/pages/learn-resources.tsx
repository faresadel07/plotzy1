import { Link } from "wouter";
import { BookOpen, Download, ExternalLink, ChevronRight, ChevronLeft, FileDown, Library } from "lucide-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { CourseBreadcrumb } from "@/components/course/CourseBreadcrumb";
import { useLanguage } from "@/contexts/language-context";
import { APPLE_FONT } from "@/lib/course-ui";
import { LIBRARY, type LibraryBook } from "@/lib/course-library";
import { CourseSticky } from "@/components/course/CourseSticky";

// The course library: a shelf of free, legally shareable craft books
// (public domain classics and CC BY texts) plus a pointer to the
// printable worksheets that live inside the lessons. Everything here is
// free to read and keep.
export default function LearnResourcesPage() {
  const { t, isRTL } = useLanguage();
  const loc = <T,>(v: { en: T; ar: T }) => (isRTL ? v.ar : v.en);

  return (
    <Layout>
      <SEO
        title={isRTL ? "مكتبة الكاتب, موارد مجانية" : "The Writer's Library, free resources"}
        description={
          isRTL
            ? "رفّ من كتب الكتابة المجانية: كلاسيكيات ملكية عامة وأدلة مفتوحة الترخيص، مع أوراق العمل القابلة للطباعة."
            : "A shelf of free writing craft books: public domain classics and open-license guides, plus printable worksheets."
        }
      />
      <main
        className="course-apple container mx-auto max-w-5xl px-4 py-8 sm:py-10 space-y-8"
        style={{ fontFamily: APPLE_FONT }}
      >
        <CourseSticky text="save this page" textAr="احفظ هاي الصفحة" rot={-7} />
        <CourseBreadcrumb
          items={[
            { label: t("courseHome"), href: "/" },
            { label: t("navCourse"), href: "/learn" },
            { label: isRTL ? "المكتبة" : "Library" },
          ]}
        />

        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <Library className="h-3.5 w-3.5" aria-hidden />
            {isRTL ? "مكتبة الكاتب" : "The Writer's Library"}
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            {isRTL ? "موارد مجانية تبقى معك" : "Free resources you get to keep"}
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            {isRTL
              ? "كتب حرفة الكتابة التي بنيت عليها هذه الدورة, كلها مجانية ومسموح مشاركتها: كلاسيكيات في الملكية العامة وأدلة حديثة مفتوحة الترخيص. اقرأها, نزّلها, واحتفظ بها."
              : "The craft books this course is built on, all free and free to share: public domain classics and modern open-license guides. Read them, download them, keep them."}
          </p>
        </header>

        {/* Worksheets pointer */}
        <Link
          href="/learn/module/foundation"
          className="group flex items-center gap-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent p-5 no-underline transition-all hover:border-primary/40 hover:shadow-[0_10px_28px_-14px_rgba(0,0,0,0.22)]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/75 text-primary-foreground shadow-sm">
            <FileDown className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.95rem] font-bold">
              {isRTL ? "ثماني أوراق عمل قابلة للطباعة" : "Eight printable worksheets"}
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              {isRTL
                ? "ورقة الفرضية, مخطط النبضات, ملف الشخصية, بطاقات المشهد وغيرها, تجدها داخل درسها في كل وحدة."
                : "Premise sheet, beat sheet, character profile, scene cards and more, each inside its lesson in every module."}
            </span>
          </span>
          {isRTL ? (
            <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" aria-hidden />
          ) : (
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
          )}
        </Link>

        {/* Book shelf */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">
            {isRTL ? "رفّ الكتب المجانية" : "The free bookshelf"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LIBRARY.map((b) => (
              <BookRow key={b.id} book={b} isRTL={isRTL} loc={loc} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground pt-2 leading-relaxed">
            {isRTL
              ? "كل كتاب هنا في الملكية العامة أو منشور برخصة المشاع الإبداعي, فهو حرّ للقراءة والتحميل والمشاركة. الكتب الكبيرة تفتح على مصدرها المجاني."
              : "Every book here is public domain or Creative Commons licensed, so it is free to read, download, and share. Larger books open at their free source."}
          </p>
        </section>
      </main>
    </Layout>
  );
}

function BookRow({
  book,
  isRTL,
  loc,
}: {
  book: LibraryBook;
  isRTL: boolean;
  loc: <T,>(v: { en: T; ar: T }) => T;
}) {
  const Chevron = isRTL ? ChevronLeft : ChevronRight;
  return (
    <a
      href={book.href}
      {...(book.external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : { download: true })}
      className="group flex flex-col rounded-2xl border bg-card p-5 no-underline shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:border-primary/40 hover:shadow-[0_10px_28px_-14px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BookOpen className="h-5 w-5" aria-hidden />
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded border px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-muted-foreground">
            {book.lang === "ar" ? "AR" : "EN"}
          </span>
          <span className="rounded border border-primary/25 px-1.5 py-0.5 text-[0.6rem] font-semibold text-primary">
            {loc(book.license)}
          </span>
        </span>
      </div>
      <div className="mt-3 min-w-0 flex-1">
        <div className="text-[1.05rem] font-bold leading-snug tracking-tight">{loc(book.title)}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{loc(book.author)}</div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{loc(book.blurb)}</p>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-primary">
        {book.external ? (
          <>
            <ExternalLink className="h-4 w-4" aria-hidden />
            {isRTL ? "اقرأه مجانا" : "Read it free"}
          </>
        ) : (
          <>
            <Download className="h-4 w-4" aria-hidden />
            {isRTL ? "حمّل ملف PDF" : "Download PDF"}
          </>
        )}
        <Chevron className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" aria-hidden />
      </div>
    </a>
  );
}
