/**
 * FAQ source of truth.
 *
 * Every answer here is verifiable against the actual codebase as of the
 * branch this lives on. Where behaviour or limits change, this file is
 * the canonical place to update; both /faq and the embedded subset on
 * /pricing render from this same data, so a single edit propagates
 * everywhere the FAQ is shown to users.
 *
 * Each entry is bilingual. English fields (question/answer/title/
 * description) are the canonical source; the *Ar fields are the Arabic
 * rendering. localizeFaqCategories(lang) returns the array with the
 * active language already swapped into question/answer/title/
 * description so every consumer (and the SEO schema builder) stays
 * unchanged.
 *
 * Honesty bar (NOT marketing copy):
 *   - No aspirational claims. If a feature does not exist in the code,
 *     it does not exist in the FAQ.
 *   - No invented dates, certifications, percentages, or guarantees.
 *   - Sensitive answers (refunds, marketplace, account deletion, AI
 *     training) use the founder-approved wording verbatim, in both
 *     languages.
 */

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  questionAr: string;
  answerAr: string;
};

export type FaqCategory = {
  id: string;
  title: string;
  description: string;
  titleAr: string;
  descriptionAr: string;
  items: FaqItem[];
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    titleAr: "البداية",
    description: "Signing up, first steps, and the Free plan.",
    descriptionAr: "إنشاء الحساب، والخطوات الأولى، والخطة المجانية.",
    items: [
      {
        id: "what-is-plotzy",
        question: "What is Plotzy?",
        questionAr: "ما هي بلوتزي؟",
        answer:
          "Plotzy is an all-in-one platform for writers. It brings together a chapter-based writing editor, an AI assistant with improve, expand, continue, and translate actions, a cover designer with text and image elements, an audiobook studio with ten AI voices, and a community library for publishing finished work. Everything operates on the same book object, so you don't have to copy-paste between separate tools.",
        answerAr:
          "بلوتزي منصة متكاملة للكتّاب. تجمع بين محرّر كتابة قائم على الفصول، ومساعد ذكاء اصطناعي يقدّم إجراءات التحسين والتوسيع والاستكمال والترجمة، ومصمّم أغلفة بعناصر نصية وصورية، واستوديو كتب صوتية بعشرة أصوات بالذكاء الاصطناعي، ومكتبة مجتمع لنشر الأعمال المكتملة. كل شيء يعمل على كائن الكتاب نفسه، فلا حاجة للنسخ واللصق بين أدوات منفصلة.",
      },
      {
        id: "how-do-i-sign-up",
        question: "How do I sign up?",
        questionAr: "كيف أُنشئ حساباً؟",
        answer:
          "Plotzy supports email-and-password signup as well as Google, Apple, and LinkedIn sign-in. The fastest path is the Google One Tap prompt that appears on the homepage if you have a Google session in your browser. Email signups send a verification link to confirm ownership of your address before you can publish or comment.",
        answerAr:
          "تدعم بلوتزي التسجيل بالبريد الإلكتروني وكلمة المرور، إضافةً إلى تسجيل الدخول عبر Google وApple وLinkedIn. أسرع طريقة هي نافذة Google One Tap التي تظهر في الصفحة الرئيسية إذا كانت لديك جلسة Google في متصفّحك. التسجيل بالبريد يُرسل رابط تأكيد للتحقّق من ملكيتك للعنوان قبل أن تتمكّن من النشر أو التعليق.",
      },
      {
        id: "credit-card-required",
        question: "Do I need a credit card to start?",
        questionAr: "هل أحتاج إلى بطاقة ائتمان للبدء؟",
        answer:
          "No. The Free plan does not require any payment information. You can write, generate covers, use the AI assistant within Free-plan limits, browse the Community Library, and explore the Project Gutenberg catalog without entering a card.",
        answerAr:
          "لا. الخطة المجانية لا تتطلّب أي معلومات دفع. يمكنك الكتابة، وتوليد الأغلفة، واستخدام مساعد الذكاء الاصطناعي ضمن حدود الخطة المجانية، وتصفّح مكتبة المجتمع، واستكشاف فهرس مشروع جوتنبرج دون إدخال أي بطاقة.",
      },
      {
        id: "what-can-i-do-for-free",
        question: "What can I do on the Free plan?",
        questionAr: "ماذا أستطيع أن أفعل في الخطة المجانية؟",
        answer:
          "The Free plan limits are: 3 chapters total across all your books, 5,000 words per chapter, 10 AI assists per day, 2 AI cover images per day, and 1 published book in the Community Library. Beyond those limits, Free includes the full feature set: the writing editor, audiobook studio with 10 AI voices, PDF and EPUB export, AI analysis tools, the cover designer, voice dictation, the Story Bible and Research board, book collaboration, and version history.",
        answerAr:
          "حدود الخطة المجانية هي: 3 فصول إجمالاً عبر كل كتبك، و5,000 كلمة لكل فصل، و10 مساعدات ذكاء اصطناعي يومياً، وصورتا غلاف بالذكاء الاصطناعي يومياً، وكتاب واحد منشور في مكتبة المجتمع. وفيما عدا هذه الحدود، تشمل الخطة المجانية مجموعة الميزات الكاملة: محرّر الكتابة، واستوديو الكتب الصوتية بـ10 أصوات بالذكاء الاصطناعي، والتصدير إلى PDF وEPUB، وأدوات التحليل بالذكاء الاصطناعي، ومصمّم الغلاف، والإملاء الصوتي، وموسوعة القصة ولوحة البحث، والتعاون على الكتب، وسجل النسخ.",
      },
      {
        id: "create-first-book",
        question: "How do I create my first book?",
        questionAr: "كيف أُنشئ كتابي الأول؟",
        answer:
          "From your library, click the New Book button. The onboarding wizard walks you through three short steps: a title, an author name and genre, and a brief premise of your protagonist. Once complete, the book opens in the editor with a blank first chapter ready to write.",
        answerAr:
          "من مكتبتك، اضغط زر «كتاب جديد». يرشدك معالج البدء عبر ثلاث خطوات قصيرة: العنوان، واسم المؤلف والنوع الأدبي، ونبذة موجزة عن بطل قصتك. وبمجرّد الانتهاء، يُفتح الكتاب في المحرّر بفصل أول فارغ جاهز للكتابة.",
      },
    ],
  },
  {
    id: "writing-and-books",
    title: "Writing & Books",
    titleAr: "الكتابة والكتب",
    description: "How the editor works, importing manuscripts, and what languages we support.",
    descriptionAr: "كيف يعمل المحرّر، واستيراد المخطوطات، واللغات التي ندعمها.",
    items: [
      {
        id: "writing-editor",
        question: "What writing editor does Plotzy use?",
        questionAr: "أي محرّر كتابة تستخدم بلوتزي؟",
        answer:
          "Plotzy's editor is built on TipTap, a modern rich-text framework that produces clean, structured documents. The chapter is the atomic unit of writing. You can format text, organize chapters within a book, drag to reorder, and track word counts and writing streaks automatically.",
        answerAr:
          "محرّر بلوتزي مبني على TipTap، وهو إطار حديث للنص المنسّق ينتج مستندات نظيفة ومنظّمة. الفصل هو الوحدة الأساسية للكتابة. يمكنك تنسيق النص، وتنظيم الفصول داخل الكتاب، والسحب لإعادة الترتيب، وتتبّع عدد الكلمات وسلاسل الكتابة تلقائياً.",
      },
      {
        id: "import-manuscript",
        question: "Can I import an existing manuscript?",
        questionAr: "هل يمكنني استيراد مخطوطة موجودة؟",
        answer:
          "Yes. Plotzy accepts PDF and DOCX file imports from inside any book's settings. The platform extracts the raw text and creates a chapter draft for you to edit. After import, an AI analysis suggests characters and story beats based on the imported content.",
        answerAr:
          "نعم. تقبل بلوتزي استيراد ملفات PDF وDOCX من داخل إعدادات أي كتاب. تستخرج المنصة النص الخام وتنشئ مسودّة فصل لتحرّرها. وبعد الاستيراد، يقترح تحليل بالذكاء الاصطناعي شخصيات ومحطّات للقصة بناءً على المحتوى المستورد.",
      },
      {
        id: "drafts-saved",
        question: "How are my drafts saved?",
        questionAr: "كيف تُحفظ مسودّاتي؟",
        answer:
          "Your work is saved automatically as you type. The editor sends changes to the server every few seconds, and your manuscript persists across devices and browser sessions. There is no manual save button to remember.",
        answerAr:
          "يُحفظ عملك تلقائياً أثناء الكتابة. يرسل المحرّر التغييرات إلى الخادم كل بضع ثوانٍ، وتبقى مخطوطتك محفوظة عبر الأجهزة وجلسات المتصفّح. لا يوجد زر حفظ يدوي عليك تذكّره.",
      },
      {
        id: "work-offline",
        question: "Can I work offline?",
        questionAr: "هل يمكنني العمل دون اتصال بالإنترنت؟",
        answer:
          "The web application caches the app shell so you can re-open Plotzy without an internet connection and view recently-loaded content. Active editing requires a connection because saves go to the server. Full offline editing is not currently supported.",
        answerAr:
          "يخزّن تطبيق الويب هيكل التطبيق مؤقتاً، فيمكنك إعادة فتح بلوتزي دون اتصال بالإنترنت ومشاهدة المحتوى المُحمَّل حديثاً. أما التحرير الفعلي فيتطلّب اتصالاً لأن عمليات الحفظ تذهب إلى الخادم. التحرير الكامل دون اتصال غير مدعوم حالياً.",
      },
      {
        id: "how-many-books",
        question: "How many books can I create?",
        questionAr: "كم كتاباً أستطيع أن أُنشئ؟",
        answer:
          "The Free plan caps your total chapter count at 3 across all your books. Free users can create as many book entries as they want, but the chapters across all of them must total 3 or fewer. Pro and Premium plans don't enforce a chapter or book count today.",
        answerAr:
          "تحدّ الخطة المجانية إجمالي عدد فصولك بـ3 عبر كل كتبك. يستطيع مستخدمو الخطة المجانية إنشاء أي عدد من الكتب، لكن مجموع الفصول عبرها جميعاً يجب ألّا يتجاوز 3. خطّتا Pro وPremium لا تفرضان حداً لعدد الفصول أو الكتب اليوم.",
      },
      {
        id: "writing-languages",
        question: "What languages can I write in?",
        questionAr: "بأي لغات يمكنني الكتابة؟",
        answer:
          "You can write in any of 45 supported book languages including English, Arabic, French, Spanish, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Hindi, Turkish, Hebrew, Persian, Urdu, and others. Right-to-left scripts including Arabic, Hebrew, Persian, and Urdu render natively. The user interface itself is currently available in 14 languages.",
        answerAr:
          "يمكنك الكتابة بأي من 45 لغة كتاب مدعومة، منها الإنجليزية والعربية والفرنسية والإسبانية والألمانية والإيطالية والبرتغالية والروسية والصينية واليابانية والكورية والهندية والتركية والعبرية والفارسية والأردية وغيرها. تُعرض الكتابات من اليمين إلى اليسار، ومنها العربية والعبرية والفارسية والأردية، بشكل أصيل. أما واجهة المستخدم نفسها فمتاحة حالياً بـ14 لغة.",
      },
      {
        id: "export-book",
        question: "How do I export my finished book?",
        questionAr: "كيف أُصدّر كتابي بعد الانتهاء؟",
        answer:
          "From the book's settings, you can download your manuscript as a PDF or EPUB. This export is available across all plans: Free, Pro, and Premium.",
        answerAr:
          "من إعدادات الكتاب، يمكنك تنزيل مخطوطتك بصيغة PDF أو EPUB. هذا التصدير متاح في كل الخطط: المجانية وPro وPremium.",
      },
    ],
  },
  {
    id: "ai-assistant",
    title: "AI Assistant",
    titleAr: "مساعد الذكاء الاصطناعي",
    description: "What the AI does, what it doesn't do, and how your content is handled.",
    descriptionAr: "ماذا يفعل الذكاء الاصطناعي، وماذا لا يفعل، وكيف يُتعامَل مع محتواك.",
    items: [
      {
        id: "ai-actions",
        question: "What can the AI assistant do?",
        questionAr: "ماذا يستطيع مساعد الذكاء الاصطناعي أن يفعل؟",
        answer:
          "Plotzy's AI assistant offers four named text actions inside the editor. Improve rewrites a selection for clarity and flow without changing meaning. Expand develops the selection into a fuller passage. Continue extends prose forward from where you left off. Translate converts a passage into any of the 45 supported book languages. The assistant also generates back-cover blurbs from your chapters and AI cover images for the cover designer.",
        answerAr:
          "يقدّم مساعد الذكاء الاصطناعي في بلوتزي أربعة إجراءات نصية مسمّاة داخل المحرّر. «التحسين» يعيد صياغة التحديد لأجل الوضوح والانسياب دون تغيير المعنى. «التوسيع» يطوّر التحديد إلى مقطع أوفى. «الاستكمال» يمدّ النثر إلى الأمام من حيث توقّفت. «الترجمة» يحوّل المقطع إلى أي من 45 لغة كتاب مدعومة. كما يولّد المساعد أوصاف الغلاف الخلفي من فصولك، وصور أغلفة بالذكاء الاصطناعي لمصمّم الغلاف.",
      },
      {
        id: "ai-provider",
        question: "Which AI provider powers it?",
        questionAr: "أي مزوّد ذكاء اصطناعي يشغّله؟",
        answer:
          "Plotzy uses OpenAI for text generation, image generation, audio transcription via Whisper, and audiobook narration. Self-hosted deployments can configure compatible providers through environment variables.",
        answerAr:
          "تستخدم بلوتزي OpenAI لتوليد النص، وتوليد الصور، وتفريغ الصوت عبر Whisper، ورواية الكتب الصوتية. ويمكن للنسخ المستضافة ذاتياً ضبط مزوّدين متوافقين عبر متغيّرات البيئة.",
      },
      {
        id: "ai-training",
        question: "Do you train AI models on my writing?",
        questionAr: "هل تدرّبون نماذج الذكاء الاصطناعي على كتابتي؟",
        answer:
          "No. Your books, drafts, and chapters are not used to train AI models. Plotzy logs only token counts and cost estimates per AI request, never the prompt content or the model's response. We do not share your writing with third-party AI providers for training purposes.",
        answerAr:
          "لا. لا تُستخدم كتبك ولا مسودّاتك ولا فصولك لتدريب نماذج الذكاء الاصطناعي. تسجّل بلوتزي فقط عدد الرموز وتقديرات التكلفة لكل طلب ذكاء اصطناعي، ولا تسجّل أبداً محتوى الطلب ولا استجابة النموذج. ولا نشارك كتابتك مع مزوّدي ذكاء اصطناعي خارجيين لأغراض التدريب.",
      },
      {
        id: "ai-out-of-assists",
        question: "What happens when I run out of AI assists?",
        questionAr: "ماذا يحدث عندما تنفد مساعدات الذكاء الاصطناعي لديّ؟",
        answer:
          "AI assists are counted per day and reset daily. Free plans receive 10 per day, Pro 100, and Premium 200. When you reach your daily limit, the assistant returns a clear message indicating you have hit the cap. Your manuscript continues to work normally; only the AI features pause until the next day.",
        answerAr:
          "تُحتسب مساعدات الذكاء الاصطناعي يومياً وتُعاد التهيئة كل يوم. تحصل الخطة المجانية على 10 يومياً، وPro على 100، وPremium على 200. وعند بلوغك الحد اليومي، يعيد المساعد رسالة واضحة تشير إلى أنك بلغت الحد. تستمر مخطوطتك بالعمل بشكل طبيعي؛ تتوقّف ميزات الذكاء الاصطناعي وحدها حتى اليوم التالي.",
      },
      {
        id: "ai-other-languages",
        question: "Can I use AI in languages other than English?",
        questionAr: "هل يمكنني استخدام الذكاء الاصطناعي بلغات غير الإنجليزية؟",
        answer:
          "Yes. The AI assistant operates in all supported languages. For Arabic specifically, the assistant uses a dedicated system prompt that asks for Modern Standard Arabic with literary cadence, which produces stronger results than an English-default prompt simply translated.",
        answerAr:
          "نعم. يعمل مساعد الذكاء الاصطناعي بكل اللغات المدعومة. وفي العربية تحديداً، يستخدم المساعد موجّهاً نظامياً مخصّصاً يطلب العربية الفصحى المعاصرة بإيقاع أدبي، وهو ما ينتج نتائج أقوى من موجّه إنجليزي افتراضي مُترجَم فحسب.",
      },
    ],
  },
  {
    id: "pricing",
    title: "Pricing & Subscriptions",
    titleAr: "الأسعار والاشتراكات",
    description: "Plans, billing, cancellations, and refund policy.",
    descriptionAr: "الخطط، والفوترة، والإلغاء، وسياسة الاسترداد.",
    items: [
      {
        id: "what-plans",
        question: "What plans does Plotzy offer?",
        questionAr: "ما الخطط التي تقدّمها بلوتزي؟",
        answer:
          "Plotzy has three tiers. Free has no cost and practical limits suitable for trying the platform. Pro is $4.99 per month or $50.99 per year (founders pricing). Premium is $8.99 per month or $91.99 per year (founders pricing). The yearly cycles save 15 percent over the monthly rates for both Pro and Premium. Founders pricing is locked in for the first 500 members.",
        answerAr:
          "لبلوتزي ثلاث فئات. المجانية بلا تكلفة وبحدود عملية مناسبة لتجربة المنصة. Pro بسعر 4.99 دولار شهرياً أو 50.99 دولار سنوياً (سعر المؤسّسين). Premium بسعر 8.99 دولار شهرياً أو 91.99 دولار سنوياً (سعر المؤسّسين). توفّر الدورات السنوية 15 بالمئة عن الأسعار الشهرية لكلٍّ من Pro وPremium. سعر المؤسّسين مثبّت لأول 500 عضو.",
      },
      {
        id: "pro-vs-premium",
        question: "What's the difference between Pro and Premium?",
        questionAr: "ما الفرق بين Pro وPremium؟",
        answer:
          "Pro ($4.99/month) raises Free's daily AI assists from 10 to 100 and unlocks 3 AI Marketplace analyses per month. Premium ($8.99/month) raises the daily AI assists to 200 and unlocks 9 AI Marketplace analyses per month. Beyond AI quotas, all three plans currently share the same feature set; Pro and Premium remove the Free plan's chapter and per-chapter word caps.",
        answerAr:
          "ترفع Pro (4.99 دولار/شهر) مساعدات الذكاء الاصطناعي اليومية من 10 إلى 100، وتفتح 3 تحليلات في متجر الذكاء الاصطناعي شهرياً. وترفع Premium (8.99 دولار/شهر) المساعدات اليومية إلى 200، وتفتح 9 تحليلات في متجر الذكاء الاصطناعي شهرياً. وفيما عدا حصص الذكاء الاصطناعي، تتشارك الخطط الثلاث حالياً مجموعة الميزات نفسها؛ وتزيل Pro وPremium حدّي الفصول وكلمات الفصل في الخطة المجانية.",
      },
      {
        id: "upgrade-downgrade",
        question: "How do I upgrade or downgrade?",
        questionAr: "كيف أرقّي خطّتي أو أخفّضها؟",
        answer:
          "From your Account Subscription page, click the plan you want. The checkout flow handles upgrades through PayPal. Downgrades take effect at the end of your current billing period; you keep your current tier's features until that period ends.",
        answerAr:
          "من صفحة اشتراك حسابك، اضغط على الخطة التي تريدها. يتولّى مسار الدفع الترقيات عبر PayPal. أما التخفيضات فتسري في نهاية فترة الفوترة الحالية؛ وتحتفظ بميزات فئتك الحالية حتى انتهاء تلك الفترة.",
      },
      {
        id: "cancel-anytime",
        question: "Can I cancel anytime?",
        questionAr: "هل يمكنني الإلغاء في أي وقت؟",
        answer:
          "Yes. From your Account Subscription page, click Cancel Subscription and confirm in the modal. You retain full access to your current plan's features until the end of your billing period. There are no cancellation fees.",
        answerAr:
          "نعم. من صفحة اشتراك حسابك، اضغط «إلغاء الاشتراك» وأكّد في النافذة. تحتفظ بوصول كامل إلى ميزات خطّتك الحالية حتى نهاية فترة الفوترة. ولا توجد رسوم إلغاء.",
      },
      {
        id: "what-happens-if-i-cancel",
        question: "What happens if I cancel my subscription?",
        questionAr: "ماذا يحدث إذا ألغيت اشتراكي؟",
        answer:
          "Your books remain in your account; nothing is deleted. After the current period ends, your account returns to the Free plan limits, so your daily AI assist budget drops back to 10 per day, and creating new chapters or words above the Free caps is blocked. Existing content stays in your library and remains readable. If you resubscribe later, the higher AI assist quota returns immediately.",
        answerAr:
          "تبقى كتبك في حسابك؛ لا يُحذف شيء. بعد انتهاء الفترة الحالية، يعود حسابك إلى حدود الخطة المجانية، فتعود ميزانية مساعدات الذكاء الاصطناعي اليومية إلى 10 يومياً، ويُمنع إنشاء فصول أو كلمات جديدة فوق حدود الخطة المجانية. يبقى المحتوى الموجود في مكتبتك وقابلاً للقراءة. وإذا أعدت الاشتراك لاحقاً، تعود الحصة الأعلى من المساعدات فوراً.",
      },
      {
        id: "auto-renewal",
        question: "Will I be charged automatically?",
        questionAr: "هل سيُخصَم منّي تلقائياً؟",
        answer:
          "Yes. Subscriptions renew automatically through PayPal at the end of each billing period (monthly or yearly depending on your plan). You will see the renewal in your PayPal account. To stop renewal, cancel from Account Subscription before the renewal date.",
        answerAr:
          "نعم. تتجدّد الاشتراكات تلقائياً عبر PayPal في نهاية كل فترة فوترة (شهرياً أو سنوياً حسب خطّتك). سترى التجديد في حساب PayPal الخاص بك. ولإيقاف التجديد، ألغِ من صفحة اشتراك الحساب قبل تاريخ التجديد.",
      },
      {
        id: "refunds",
        question: "Do you offer refunds?",
        questionAr: "هل تقدّمون استرداداً للمبالغ؟",
        answer:
          "Plotzy does not currently offer automatic refunds. We review unhappy situations on a case-by-case basis. If you are unsatisfied with your subscription, contact us at faresadel@gmail.com and we will work with you on a fair resolution.",
        answerAr:
          "لا تقدّم بلوتزي حالياً استرداداً تلقائياً للمبالغ. نراجع الحالات غير المُرضية كلٌّ على حدة. إذا لم تكن راضياً عن اشتراكك، تواصل معنا على faresadel@gmail.com وسنعمل معك على حلٍّ منصف.",
      },
      {
        id: "discounts",
        question: "Do you offer student or regional discounts?",
        questionAr: "هل تقدّمون خصومات للطلاب أو خصومات إقليمية؟",
        answer:
          "We do not currently offer formal student or regional discount programs. If you are in a situation where the standard pricing is a barrier (for example, a verified student with proof of enrollment, or a writer in a region where the dollar conversion makes the plan disproportionately expensive), email us at faresadel@gmail.com and we will look at your case individually.",
        answerAr:
          "لا نقدّم حالياً برامج خصم رسمية للطلاب أو خصومات إقليمية. إذا كنت في وضع يجعل السعر القياسي عائقاً (مثلاً طالب موثَّق مع إثبات قيد، أو كاتب في منطقة يجعل فيها تحويل الدولار الخطة باهظة بشكل غير متناسب)، راسلنا على faresadel@gmail.com وسننظر في حالتك فردياً.",
      },
      {
        id: "annual-discount",
        question: "Are there annual discounts?",
        questionAr: "هل توجد خصومات سنوية؟",
        answer:
          "Yes. Pro yearly is $50.99 versus $59.88 if you paid monthly for 12 months, a 15 percent saving. Premium yearly is $91.99 versus $107.88 for 12 monthly payments, also a 15 percent saving.",
        answerAr:
          "نعم. اشتراك Pro السنوي 50.99 دولار مقابل 59.88 دولار لو دفعت شهرياً لمدة 12 شهراً، أي توفير 15 بالمئة. واشتراك Premium السنوي 91.99 دولار مقابل 107.88 دولار لـ12 دفعة شهرية، وهو أيضاً توفير 15 بالمئة.",
      },
      {
        id: "payment-methods",
        question: "What payment methods do you accept?",
        questionAr: "ما طرق الدفع التي تقبلونها؟",
        answer:
          "Plotzy uses PayPal as its payment processor. PayPal supports both the PayPal account flow and direct credit-card payments that do not require a PayPal account. Both options run through the same checkout. Apple Pay support is on the roadmap for the production launch.",
        answerAr:
          "تستخدم بلوتزي PayPal كمعالج دفع. يدعم PayPal كلاً من مسار حساب PayPal والدفع المباشر ببطاقة الائتمان دون الحاجة إلى حساب PayPal. يمرّ الخياران عبر صفحة الدفع نفسها. ودعم Apple Pay مدرَج في خارطة الطريق لإطلاق النسخة الإنتاجية.",
      },
    ],
  },
  {
    id: "publishing-and-marketplace",
    title: "Publishing & Marketplace",
    titleAr: "النشر والمتجر",
    description: "Publishing to the Community Library and what the Marketplace currently offers.",
    descriptionAr: "النشر في مكتبة المجتمع وما يقدّمه المتجر حالياً.",
    items: [
      {
        id: "publish-book",
        question: "How do I publish a book to the Community Library?",
        questionAr: "كيف أنشر كتاباً في مكتبة المجتمع؟",
        answer:
          "Open your book and use the publish action in the book's settings. The book becomes visible to other Plotzy readers in the Community Library, where it can be browsed by genre, liked, commented on, and rated. You can unpublish the book at any time and it disappears from the public library immediately.",
        answerAr:
          "افتح كتابك واستخدم إجراء النشر في إعدادات الكتاب. يصبح الكتاب مرئياً لقرّاء بلوتزي الآخرين في مكتبة المجتمع، حيث يمكن تصفّحه حسب النوع الأدبي والإعجاب به والتعليق عليه وتقييمه. يمكنك إلغاء نشر الكتاب في أي وقت فيختفي من المكتبة العامة فوراً.",
      },
      {
        id: "who-can-read",
        question: "Who can read my published books?",
        questionAr: "من يستطيع قراءة كتبي المنشورة؟",
        answer:
          "Any signed-in Plotzy user can read books in the Community Library. Viewing currently requires a Plotzy account; we do not show book content to anonymous web visitors.",
        answerAr:
          "أي مستخدم مسجّل الدخول في بلوتزي يستطيع قراءة الكتب في مكتبة المجتمع. تتطلّب المشاهدة حالياً حساب بلوتزي؛ ولا نعرض محتوى الكتب لزوّار الويب المجهولين.",
      },
      {
        id: "unpublish-book",
        question: "Can I unpublish or remove a book?",
        questionAr: "هل يمكنني إلغاء نشر كتاب أو إزالته؟",
        answer:
          "Yes. From the book's settings, the same publish toggle that put it in the Community Library can take it back out. The book and its chapters remain in your private library. If a book has reader engagement (likes, comments), unpublishing removes the public listing but the underlying engagement data is retained in case you republish later.",
        answerAr:
          "نعم. من إعدادات الكتاب، يمكن للمفتاح نفسه الذي نشره في مكتبة المجتمع أن يُخرجه منها. يبقى الكتاب وفصوله في مكتبتك الخاصة. وإذا كان للكتاب تفاعل من القرّاء (إعجابات، تعليقات)، فإن إلغاء النشر يزيل الإدراج العام لكن بيانات التفاعل الأساسية تُحفظ تحسّباً لإعادة نشرك لاحقاً.",
      },
      {
        id: "what-is-marketplace",
        question: "What is the Marketplace?",
        questionAr: "ما هو المتجر؟",
        answer:
          "The Marketplace today is a menu of AI-powered services applied to your manuscript: developmental editing, copy editing, beta-reader feedback, cover generation, and blurb writing. You commission a service against a specific book and receive structured feedback. The Pro plan includes 3 Marketplace analyses per month; Premium includes 9 per month; the Free plan does not include Marketplace access.",
        answerAr:
          "المتجر اليوم قائمة بخدمات مدعومة بالذكاء الاصطناعي تُطبَّق على مخطوطتك: التحرير التطويري، والتحرير النسخي، وملاحظات القارئ التجريبي، وتوليد الغلاف، وكتابة الوصف. تطلب خدمةً على كتاب محدّد فتتلقّى ملاحظات منظّمة. تشمل خطة Pro 3 تحليلات في المتجر شهرياً؛ وPremium تشمل 9 شهرياً؛ والخطة المجانية لا تشمل الوصول إلى المتجر.",
      },
      {
        id: "sell-my-books",
        question: "Will I be able to sell my books on Plotzy?",
        questionAr: "هل سأتمكّن من بيع كتبي على بلوتزي؟",
        answer:
          "Direct book sales between writers and readers is on the roadmap, not currently available. The Marketplace today offers AI-powered services (developmental editing, copy editing, beta reading, cover generation, blurb writing) applied to your manuscript. When direct sales launch, Plotzy will not take a percentage of your earnings. Only standard payment-processor fees apply (charged by the processor, e.g., PayPal, not by Plotzy).",
        answerAr:
          "البيع المباشر للكتب بين الكتّاب والقرّاء مدرَج في خارطة الطريق، وغير متاح حالياً. يقدّم المتجر اليوم خدمات مدعومة بالذكاء الاصطناعي (التحرير التطويري، والتحرير النسخي، والقراءة التجريبية، وتوليد الغلاف، وكتابة الوصف) تُطبَّق على مخطوطتك. وعند إطلاق البيع المباشر، لن تأخذ بلوتزي نسبة من أرباحك. تنطبق فقط رسوم معالج الدفع القياسية (يفرضها المعالج، مثل PayPal، لا بلوتزي).",
      },
    ],
  },
  {
    id: "audiobook-studio",
    title: "Audiobook Studio",
    titleAr: "استوديو الكتب الصوتية",
    description: "Voices, export limits, and language coverage.",
    descriptionAr: "الأصوات، وحدود التصدير، وتغطية اللغات.",
    items: [
      {
        id: "audiobook-how",
        question: "How does the audiobook studio work?",
        questionAr: "كيف يعمل استوديو الكتب الصوتية؟",
        answer:
          "Open any book and the audiobook studio reads through your chapters, generating audio with the voice and quality settings you choose. You can preview individual chapters with a live waveform, then export the full audiobook as a single MP3 file with embedded metadata. The studio uses OpenAI's text-to-speech models for production-quality narration.",
        answerAr:
          "افتح أي كتاب فيقرأ استوديو الكتب الصوتية فصولك مولّداً الصوت بإعدادات الصوت والجودة التي تختارها. يمكنك معاينة فصول مفردة بموجة صوتية حيّة، ثم تصدير الكتاب الصوتي كاملاً كملف MP3 واحد ببيانات وصفية مضمّنة. يستخدم الاستوديو نماذج تحويل النص إلى كلام من OpenAI لرواية بجودة إنتاجية.",
      },
      {
        id: "audiobook-voices",
        question: "How many voices are available?",
        questionAr: "كم صوتاً متاح؟",
        answer:
          "Ten distinct AI voices are available: Nova, Alloy, Shimmer, Onyx, Echo, Fable, Coral, Ash, Ballad, and Sage. Each voice has documented gender, accent, and tonal characteristics so you can pick one that fits your protagonist or narrator. Reading speed adjusts continuously from a quarter speed to four times normal.",
        answerAr:
          "تتوفّر عشرة أصوات مميّزة بالذكاء الاصطناعي: Nova وAlloy وShimmer وOnyx وEcho وFable وCoral وAsh وBallad وSage. لكل صوت خصائص موثّقة من حيث الجنس واللهجة والنبرة، فتختار ما يناسب بطلك أو راويك. وتُضبط سرعة القراءة بسلاسة من رُبع السرعة إلى أربعة أضعاف السرعة العادية.",
      },
      {
        id: "audiobook-exports",
        question: "How many audiobooks can I export per month?",
        questionAr: "كم كتاباً صوتياً أستطيع تصديره شهرياً؟",
        answer:
          "Audiobook export is currently available across all plans: Free, Pro, and Premium. Each export consumes from your daily AI assist budget, so larger books (or many exports) draw faster on the Free plan's 10 assists/day than on Pro's 100/day or Premium's 200/day.",
        answerAr:
          "تصدير الكتب الصوتية متاح حالياً في كل الخطط: المجانية وPro وPremium. يستهلك كل تصدير من ميزانية مساعدات الذكاء الاصطناعي اليومية، فالكتب الأكبر (أو كثرة التصدير) تستنزف أسرع على الخطة المجانية بـ10 مساعدات/يوم منها على Pro بـ100/يوم أو Premium بـ200/يوم.",
      },
      {
        id: "audiobook-languages",
        question: "What languages does the audiobook support?",
        questionAr: "ما اللغات التي يدعمها الكتاب الصوتي؟",
        answer:
          "The audiobook studio currently produces English audio with the highest fidelity. Multilingual support is on the roadmap; for languages where the OpenAI voices produce inconsistent quality, the studio recommends the browser-based preview as a fallback.",
        answerAr:
          "ينتج استوديو الكتب الصوتية حالياً صوتاً إنجليزياً بأعلى دقّة. الدعم متعدّد اللغات مدرَج في خارطة الطريق؛ وفي اللغات التي تنتج فيها أصوات OpenAI جودة غير ثابتة، يوصي الاستوديو بالمعاينة عبر المتصفّح كحلٍّ بديل.",
      },
    ],
  },
  {
    id: "privacy-and-data",
    title: "Privacy & Data",
    titleAr: "الخصوصية والبيانات",
    description: "What we collect, where it lives, and how to remove it.",
    descriptionAr: "ما الذي نجمعه، وأين يُحفظ، وكيف تزيله.",
    items: [
      {
        id: "writing-private",
        question: "Is my writing private?",
        questionAr: "هل كتابتي خاصة؟",
        answer:
          "Yes by default. Books are private to your account when you create them. They become visible to other Plotzy users only if you explicitly publish them to the Community Library, and you can unpublish at any time. Direct messages between users are visible only to the two participants.",
        answerAr:
          "نعم افتراضياً. تكون الكتب خاصة بحسابك عند إنشائها. ولا تصبح مرئية لمستخدمي بلوتزي الآخرين إلا إذا نشرتها صراحةً في مكتبة المجتمع، ويمكنك إلغاء النشر في أي وقت. والرسائل المباشرة بين المستخدمين مرئية للطرفين المشاركين فقط.",
      },
      {
        id: "ai-training-detail",
        question: "Do you train AI on my content?",
        questionAr: "هل تدرّبون الذكاء الاصطناعي على محتواي؟",
        answer:
          "No. Plotzy does not use your books, chapters, or drafts to train AI models. Our AI usage log stores only the user ID, endpoint name, model name, prompt and completion token counts, estimated cost, and timestamp. The actual prompt content and the model's response are never written to our database.",
        answerAr:
          "لا. لا تستخدم بلوتزي كتبك ولا فصولك ولا مسودّاتك لتدريب نماذج الذكاء الاصطناعي. يخزّن سجل استخدام الذكاء الاصطناعي لدينا فقط معرّف المستخدم، واسم نقطة النهاية، واسم النموذج، وعدد رموز الطلب والإكمال، والتكلفة المقدّرة، والطابع الزمني. ولا يُكتب أبداً محتوى الطلب الفعلي ولا استجابة النموذج في قاعدة بياناتنا.",
      },
      {
        id: "what-data-collected",
        question: "What data does Plotzy collect?",
        questionAr: "ما البيانات التي تجمعها بلوتزي؟",
        answer:
          "To run the platform, Plotzy stores your account information (email, display name, avatar URL, OAuth provider IDs), your books and chapters, payment receipts (PayPal order IDs, amounts, plan, status), AI usage counts (without content), notification records, follow graph, support messages, and aggregate page-view analytics with bot filtering. We do not collect or sell behavioral data to third parties.",
        answerAr:
          "لتشغيل المنصة، تخزّن بلوتزي معلومات حسابك (البريد الإلكتروني، واسم العرض، ورابط الصورة الرمزية، ومعرّفات مزوّدي OAuth)، وكتبك وفصولك، وإيصالات الدفع (معرّفات طلبات PayPal، والمبالغ، والخطة، والحالة)، وأعداد استخدام الذكاء الاصطناعي (دون المحتوى)، وسجلات الإشعارات، وشبكة المتابعة، ورسائل الدعم، وتحليلات مشاهدات الصفحات الإجمالية مع ترشيح الروبوتات. لا نجمع بيانات سلوكية ولا نبيعها لأطراف ثالثة.",
      },
      {
        id: "data-storage",
        question: "Where is my data stored?",
        questionAr: "أين تُخزَّن بياناتي؟",
        answer:
          "Plotzy uses Neon, a serverless PostgreSQL database provider, as its primary data store. Connections are encrypted in transit. Email is sent through Resend; payments are processed by PayPal. AI requests go to OpenAI, which does not retain prompt content for training when called through their API.",
        answerAr:
          "تستخدم بلوتزي Neon، وهو مزوّد قاعدة بيانات PostgreSQL بلا خوادم، كمخزن بياناتها الأساسي. الاتصالات مشفّرة أثناء النقل. يُرسَل البريد عبر Resend؛ وتُعالَج المدفوعات بواسطة PayPal. وتذهب طلبات الذكاء الاصطناعي إلى OpenAI، التي لا تحتفظ بمحتوى الطلب لأغراض التدريب عند استدعائها عبر واجهتها البرمجية.",
      },
      {
        id: "delete-account",
        question: "Can I delete my account?",
        questionAr: "هل يمكنني حذف حسابي؟",
        answer:
          "Account deletion is available on request. Contact us at faresadel@gmail.com. When we delete your account, your profile, email, and personal data are permanently removed. Private drafts and unpublished material go away with the account. Books you previously published to the Community Library may remain as anonymous works, because other readers may have engaged with them through likes, comments, and reading lists. Removing those books would damage the experience for readers who never agreed to lose them. Self-service account deletion is on our roadmap.",
        answerAr:
          "حذف الحساب متاح عند الطلب. تواصل معنا على faresadel@gmail.com. عند حذف حسابك، يُزال ملفك الشخصي وبريدك الإلكتروني وبياناتك الشخصية بشكل نهائي. وتزول المسودّات الخاصة والمواد غير المنشورة مع الحساب. أما الكتب التي سبق أن نشرتها في مكتبة المجتمع فقد تبقى كأعمال مجهولة المؤلف، لأن قرّاءً آخرين ربما تفاعلوا معها عبر الإعجابات والتعليقات وقوائم القراءة. إزالة تلك الكتب ستضرّ بتجربة قرّاء لم يوافقوا قطّ على فقدانها. وحذف الحساب ذاتياً مدرَج في خارطة طريقنا.",
      },
    ],
  },
  {
    id: "account-and-technical",
    title: "Account & Technical",
    titleAr: "الحساب والأمور التقنية",
    description: "Sign-in trouble, browser support, and how to reach us.",
    descriptionAr: "مشكلات تسجيل الدخول، ودعم المتصفّحات، وكيفية الوصول إلينا.",
    items: [
      {
        id: "forgot-password",
        question: "I forgot my password. What do I do?",
        questionAr: "نسيت كلمة المرور. ماذا أفعل؟",
        answer:
          "On the sign-in screen, click Forgot Password and enter your account email. Plotzy sends a password reset link valid for a limited window. Open the email, click the link, and set a new password. If you signed up via Google, Apple, or LinkedIn, you don't have a Plotzy password. Sign in with the same provider you used originally.",
        answerAr:
          "في شاشة تسجيل الدخول، اضغط «نسيت كلمة المرور» وأدخل بريد حسابك. ترسل بلوتزي رابط إعادة تعيين كلمة مرور صالحاً لمدّة محدودة. افتح البريد، واضغط الرابط، وعيّن كلمة مرور جديدة. وإذا سجّلت عبر Google أو Apple أو LinkedIn، فليست لديك كلمة مرور في بلوتزي؛ سجّل الدخول بالمزوّد نفسه الذي استخدمته أصلاً.",
      },
      {
        id: "change-email",
        question: "How do I change my email?",
        questionAr: "كيف أغيّر بريدي الإلكتروني؟",
        answer:
          "From your Account page, you can update your display name and avatar. Email change is not currently a self-service action. If you need to change the email associated with your account, contact us at faresadel@gmail.com.",
        answerAr:
          "من صفحة حسابك، يمكنك تحديث اسم العرض والصورة الرمزية. تغيير البريد ليس حالياً إجراءً ذاتياً. وإذا احتجت إلى تغيير البريد المرتبط بحسابك، تواصل معنا على faresadel@gmail.com.",
      },
      {
        id: "browser-issues",
        question: "Plotzy isn't loading on my browser. What should I do?",
        questionAr: "بلوتزي لا تُحمَّل على متصفّحي. ماذا أفعل؟",
        answer:
          "Plotzy targets modern Chrome, Safari, Firefox, and Edge browsers from the past two years. If the application doesn't load, try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R), clearing your browser cache, or trying a different browser to isolate the issue. If the problem persists, contact us at faresadel@gmail.com with your browser version and operating system.",
        answerAr:
          "تستهدف بلوتزي إصدارات Chrome وSafari وFirefox وEdge الحديثة خلال العامين الماضيين. إذا لم يُحمَّل التطبيق، جرّب تحديثاً قسرياً (Ctrl+Shift+R أو Cmd+Shift+R)، أو مسح ذاكرة المتصفّح المؤقتة، أو تجربة متصفّح مختلف لعزل المشكلة. وإذا استمرّت المشكلة، تواصل معنا على faresadel@gmail.com مع إصدار متصفّحك ونظام التشغيل.",
      },
      {
        id: "contact-support",
        question: "How do I contact support?",
        questionAr: "كيف أتواصل مع الدعم؟",
        answer:
          "Use the contact form on the Support page. We aim to respond as quickly as we can.",
        answerAr:
          "استخدم نموذج التواصل في صفحة الدعم. نهدف إلى الرد بأسرع ما يمكننا.",
      },
    ],
  },
];

/**
 * Returns FAQ_CATEGORIES with the active language already swapped into
 * the canonical question/answer/title/description fields, so every
 * consumer (and the SEO schema builder) keeps reading those fields and
 * gets the right language automatically.
 */
export function localizeFaqCategories(lang: string): FaqCategory[] {
  if (lang !== "ar") return FAQ_CATEGORIES;
  return FAQ_CATEGORIES.map((c) => ({
    ...c,
    title: c.titleAr,
    description: c.descriptionAr,
    items: c.items.map((it) => ({
      ...it,
      question: it.questionAr,
      answer: it.answerAr,
    })),
  }));
}

/**
 * Helper for the embedded /pricing FAQ section. Returns the
 * "Pricing & Subscriptions" category specifically (localized) so the
 * pricing page can render a focused subset without duplicating data.
 */
export function getPricingFaq(lang: string = "en"): FaqCategory | undefined {
  return localizeFaqCategories(lang).find((c) => c.id === "pricing");
}
