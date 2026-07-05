// Plotzy writing course content. SOURCE OF TRUTH for modules, lessons,
// quizzes, and the final-exam question bank. Bundled with the API
// server so the course content is restored automatically the next
// time the server boots, even on a fresh database. To edit the
// course, edit ./data.json (or re-dump from a populated DB and run
// scripts/clean-and-emit.mjs again).
//
// NOTE: em-dashes, en-dashes, and "--" sequences have been stripped
// from this file by tooling. Anything that re-emits this module must
// preserve that property.

// eslint-disable-next-line @typescript-eslint/no-require-imports
import data from "./data.json";

export interface CourseModule {
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  titleAr: string | null;
  subtitleAr: string | null;
  descriptionAr: string | null;
  order: number;
  estimatedMinutes: number | null;
}

export interface CourseLesson {
  moduleSlug: string;
  slug: string;
  title: string;
  titleAr: string | null;
  orderInModule: number;
  estimatedMinutes: number | null;
  content: string;
  contentAr: string | null;
  heroImageUrl: string | null;
}

export interface CourseQuiz {
  /** Stable identifier we use in sync. `final` for the final exam,
   *  or the module slug for module quizzes (one per module). */
  key: string;
  moduleSlug: string | null;
  type: "module" | "final";
  questionCount: number;
  passingPercentage: number;
  timeLimitMinutes: number | null;
}

export interface CourseQuizQuestion {
  quizKey: string;
  order: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "a" | "b" | "c" | "d";
  explanation: string;
  questionTextAr: string | null;
  optionAAr: string | null;
  optionBAr: string | null;
  optionCAr: string | null;
  optionDAr: string | null;
  explanationAr: string | null;
}

interface RawShape {
  modules: Array<{ id: number; slug: string; title: string; subtitle: string | null; description: string | null; title_ar?: string | null; subtitle_ar?: string | null; description_ar?: string | null; order: number; estimated_minutes: number | null }>;
  lessons: Array<{ id: number; module_id: number; slug: string; title: string; title_ar?: string | null; order_in_module: number; estimated_minutes: number | null; content: string; content_ar?: string | null; hero_image_url: string | null }>;
  quizzes: Array<{ id: number; module_id: number | null; type: string; question_count: number; passing_percentage: number; time_limit_minutes: number | null }>;
  questions: Array<{ id: number; quiz_id: number; order: number; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_option: string; explanation: string; question_text_ar?: string | null; option_a_ar?: string | null; option_b_ar?: string | null; option_c_ar?: string | null; option_d_ar?: string | null; explanation_ar?: string | null }>;
}

const raw = data as RawShape;

const modulesById = new Map<number, typeof raw.modules[number]>();
for (const m of raw.modules) modulesById.set(m.id, m);

const quizzesById = new Map<number, typeof raw.quizzes[number]>();
for (const q of raw.quizzes) quizzesById.set(q.id, q);

export const MODULES: CourseModule[] = raw.modules.map((m) => ({
  slug: m.slug,
  title: m.title,
  subtitle: m.subtitle,
  description: m.description,
  titleAr: m.title_ar ?? null,
  subtitleAr: m.subtitle_ar ?? null,
  descriptionAr: m.description_ar ?? null,
  order: m.order,
  estimatedMinutes: m.estimated_minutes,
}));

export const LESSONS: CourseLesson[] = raw.lessons.map((l) => {
  const mod = modulesById.get(l.module_id);
  if (!mod) throw new Error(`Lesson ${l.slug} references unknown module_id ${l.module_id}`);
  return {
    moduleSlug: mod.slug,
    slug: l.slug,
    title: l.title,
    titleAr: l.title_ar ?? null,
    orderInModule: l.order_in_module,
    estimatedMinutes: l.estimated_minutes,
    content: l.content,
    contentAr: l.content_ar ?? null,
    heroImageUrl: l.hero_image_url,
  };
});

function quizKey(q: typeof raw.quizzes[number]): string {
  if (q.type === "final") return "final";
  if (q.module_id == null) throw new Error(`Module quiz ${q.id} has no module_id`);
  const mod = modulesById.get(q.module_id);
  if (!mod) throw new Error(`Quiz ${q.id} references unknown module_id ${q.module_id}`);
  return mod.slug;
}

export const QUIZZES: CourseQuiz[] = raw.quizzes.map((q) => ({
  key: quizKey(q),
  moduleSlug: q.module_id == null ? null : modulesById.get(q.module_id)?.slug ?? null,
  type: q.type as "module" | "final",
  questionCount: q.question_count,
  passingPercentage: q.passing_percentage,
  timeLimitMinutes: q.time_limit_minutes,
}));

export const QUESTIONS: CourseQuizQuestion[] = raw.questions.map((qq) => {
  const quiz = quizzesById.get(qq.quiz_id);
  if (!quiz) throw new Error(`Question ${qq.id} references unknown quiz_id ${qq.quiz_id}`);
  return {
    quizKey: quizKey(quiz),
    order: qq.order,
    questionText: qq.question_text,
    optionA: qq.option_a,
    optionB: qq.option_b,
    optionC: qq.option_c,
    optionD: qq.option_d,
    correctOption: qq.correct_option as "a" | "b" | "c" | "d",
    explanation: qq.explanation,
    questionTextAr: qq.question_text_ar ?? null,
    optionAAr: qq.option_a_ar ?? null,
    optionBAr: qq.option_b_ar ?? null,
    optionCAr: qq.option_c_ar ?? null,
    optionDAr: qq.option_d_ar ?? null,
    explanationAr: qq.explanation_ar ?? null,
  };
});

export const COURSE_CONTENT = { MODULES, LESSONS, QUIZZES, QUESTIONS };
