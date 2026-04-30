/**
 * FAQ source of truth.
 *
 * Every answer here is verifiable against the actual codebase as of the
 * branch this lives on. Where behaviour or limits change, this file is
 * the canonical place to update — both /faq and the embedded subset on
 * /pricing render from this same data, so a single edit propagates
 * everywhere the FAQ is shown to users.
 *
 * Honesty bar (NOT marketing copy):
 *   - No aspirational claims. If a feature does not exist in the code,
 *     it does not exist in the FAQ.
 *   - No invented dates. No "available Q3 2025" promises unless the
 *     date is in a tracked roadmap doc.
 *   - No invented certifications, percentages, or guarantees. Plan
 *     limits come from lib/db/src/schema/index.ts:766+ (FREE_MAX_*,
 *     PRO_MAX_*, PREMIUM_MAX_*); pricing comes from
 *     lib/checkout-plans.ts.
 *   - Sensitive answers (refunds, marketplace, account deletion, AI
 *     training) use the founder-approved wording verbatim.
 */

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type FaqCategory = {
  id: string;
  title: string;
  description: string;
  items: FaqItem[];
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Signing up, first steps, and the Free plan.",
    items: [
      {
        id: "what-is-plotzy",
        question: "What is Plotzy?",
        answer:
          "Plotzy is an all-in-one platform for writers. It brings together a chapter-based writing editor, an AI assistant with improve, expand, continue, and translate actions, a cover designer with text and image elements, an audiobook studio with ten AI voices, and a community library for publishing finished work. Everything operates on the same book object, so you don't have to copy-paste between separate tools.",
      },
      {
        id: "how-do-i-sign-up",
        question: "How do I sign up?",
        answer:
          "Plotzy supports email-and-password signup as well as Google, Apple, and LinkedIn sign-in. The fastest path is the Google One Tap prompt that appears on the homepage if you have a Google session in your browser. Email signups send a verification link to confirm ownership of your address before you can publish or comment.",
      },
      {
        id: "credit-card-required",
        question: "Do I need a credit card to start?",
        answer:
          "No. The Free plan does not require any payment information. You can write, generate covers, use the AI assistant within Free-plan limits, browse the Community Library, and explore the Project Gutenberg catalog without entering a card.",
      },
      {
        id: "what-can-i-do-for-free",
        question: "What can I do on the Free plan?",
        answer:
          "The Free plan lets you create up to 2 books with up to 3 chapters each, write up to 5,000 total words across your account, use the AI assistant 10 times per day, generate up to 2 AI cover images per day, and publish 1 book to the Community Library. Audiobook export is not included in the Free plan, but the browser preview using your device's built-in voices is available.",
      },
      {
        id: "create-first-book",
        question: "How do I create my first book?",
        answer:
          "From your library, click the New Book button. The onboarding wizard walks you through three short steps: a title, an author name and genre, and a brief premise of your protagonist. Once complete, the book opens in the editor with a blank first chapter ready to write.",
      },
    ],
  },
  {
    id: "writing-and-books",
    title: "Writing & Books",
    description: "How the editor works, importing manuscripts, and what languages we support.",
    items: [
      {
        id: "writing-editor",
        question: "What writing editor does Plotzy use?",
        answer:
          "Plotzy's editor is built on TipTap, a modern rich-text framework that produces clean, structured documents. The chapter is the atomic unit of writing. You can format text, organize chapters within a book, drag to reorder, and track word counts and writing streaks automatically.",
      },
      {
        id: "import-manuscript",
        question: "Can I import an existing manuscript?",
        answer:
          "Yes. Plotzy accepts PDF and DOCX file imports from inside any book's settings. The platform extracts the raw text and creates a chapter draft for you to edit. After import, an AI analysis suggests characters and story beats based on the imported content.",
      },
      {
        id: "drafts-saved",
        question: "How are my drafts saved?",
        answer:
          "Your work is saved automatically as you type. The editor sends changes to the server every few seconds, and your manuscript persists across devices and browser sessions. There is no manual save button to remember.",
      },
      {
        id: "work-offline",
        question: "Can I work offline?",
        answer:
          "The web application caches the app shell so you can re-open Plotzy without an internet connection and view recently-loaded content. Active editing requires a connection because saves go to the server. Full offline editing is not currently supported.",
      },
      {
        id: "how-many-books",
        question: "How many books can I create?",
        answer:
          "The Free plan allows up to 2 books. Pro raises that to 50 books. Premium effectively removes the limit at 9,999 books. Within each book, Free is capped at 3 chapters, Pro at 100, and Premium at 9,999.",
      },
      {
        id: "writing-languages",
        question: "What languages can I write in?",
        answer:
          "You can write in any of 45 supported book languages including English, Arabic, French, Spanish, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Hindi, Turkish, Hebrew, Persian, Urdu, and others. Right-to-left scripts including Arabic, Hebrew, Persian, and Urdu render natively. The user interface itself is currently available in 14 languages.",
      },
      {
        id: "export-book",
        question: "How do I export my finished book?",
        answer:
          "From the book's settings on Pro and Premium plans, you can download your manuscript as a PDF or EPUB. Free-plan users can copy text out of the editor manually but do not have direct PDF or EPUB export.",
      },
    ],
  },
  {
    id: "ai-assistant",
    title: "AI Assistant",
    description: "What the AI does, what it doesn't do, and how your content is handled.",
    items: [
      {
        id: "ai-actions",
        question: "What can the AI assistant do?",
        answer:
          "Plotzy's AI assistant offers four named text actions inside the editor. Improve rewrites a selection for clarity and flow without changing meaning. Expand develops the selection into a fuller passage. Continue extends prose forward from where you left off. Translate converts a passage into any of the 45 supported book languages. The assistant also generates back-cover blurbs from your chapters and AI cover images for the cover designer.",
      },
      {
        id: "ai-provider",
        question: "Which AI provider powers it?",
        answer:
          "Plotzy uses OpenAI for text generation, image generation, audio transcription via Whisper, and audiobook narration. Self-hosted deployments can configure compatible providers through environment variables.",
      },
      {
        id: "ai-training",
        question: "Do you train AI models on my writing?",
        answer:
          "No. Your books, drafts, and chapters are not used to train AI models. Plotzy logs only token counts and cost estimates per AI request, never the prompt content or the model's response. We do not share your writing with third-party AI providers for training purposes.",
      },
      {
        id: "ai-out-of-assists",
        question: "What happens when I run out of AI assists?",
        answer:
          "AI assists are counted per day and reset daily. Free plans receive 10 per day, Pro 100, and Premium 200. When you reach your daily limit, the assistant returns a clear message indicating you have hit the cap. Your manuscript continues to work normally; only the AI features pause until the next day.",
      },
      {
        id: "ai-other-languages",
        question: "Can I use AI in languages other than English?",
        answer:
          "Yes. The AI assistant operates in all supported languages. For Arabic specifically, the assistant uses a dedicated system prompt that asks for Modern Standard Arabic with literary cadence, which produces stronger results than an English-default prompt simply translated.",
      },
    ],
  },
  {
    id: "pricing",
    title: "Pricing & Subscriptions",
    description: "Plans, billing, cancellations, and refund policy.",
    items: [
      {
        id: "what-plans",
        question: "What plans does Plotzy offer?",
        answer:
          "Plotzy has three tiers. Free has no cost and practical limits suitable for trying the platform. Pro is $8.99 per month or $79.99 per year. Premium is $16.99 per month or $159.99 per year. The yearly cycles save roughly 26 and 22 percent over monthly billing for Pro and Premium respectively.",
      },
      {
        id: "pro-vs-premium",
        question: "What's the difference between Pro and Premium?",
        answer:
          "Pro raises the Free limits significantly: 50 books, 100 chapters per book, 500,000 total words, 100 AI assists per day, 10 AI cover images per day, 20 published books, and 3 audiobook exports per month. Premium effectively removes structural caps with 9,999-book and 9,999-chapter ceilings, 200 AI assists per day, 25 cover images per day, and 10 audiobook exports per month. Premium also includes 9 AI Marketplace analyses per month and faster support response.",
      },
      {
        id: "upgrade-downgrade",
        question: "How do I upgrade or downgrade?",
        answer:
          "From your Account Subscription page, click the plan you want. The checkout flow handles upgrades through PayPal. Downgrades take effect at the end of your current billing period; you keep your current tier's features until that period ends.",
      },
      {
        id: "cancel-anytime",
        question: "Can I cancel anytime?",
        answer:
          "Yes. From your Account Subscription page, click Cancel Subscription and confirm in the modal. You retain full access to your current plan's features until the end of your billing period. There are no cancellation fees.",
      },
      {
        id: "what-happens-if-i-cancel",
        question: "What happens if I cancel my subscription?",
        answer:
          "Your books remain in your account; nothing is deleted. After the current period ends, your account returns to the Free plan limits, which means some features will be reduced (for example, AI assists drop to 10 per day, audiobook export becomes browser-preview only). Your existing books stay in your library and remain readable. If you resubscribe later, all paid features return immediately.",
      },
      {
        id: "auto-renewal",
        question: "Will I be charged automatically?",
        answer:
          "Yes. Subscriptions renew automatically through PayPal at the end of each billing period (monthly or yearly depending on your plan). You will see the renewal in your PayPal account. To stop renewal, cancel from Account Subscription before the renewal date.",
      },
      {
        id: "refunds",
        question: "Do you offer refunds?",
        answer:
          "Plotzy does not currently offer automatic refunds. We review unhappy situations on a case-by-case basis. If you are unsatisfied with your subscription, contact us at faresadel@gmail.com and we will work with you on a fair resolution.",
      },
      {
        id: "discounts",
        question: "Do you offer student or regional discounts?",
        answer:
          "We do not currently offer formal student or regional discount programs. If you are in a situation where the standard pricing is a barrier (for example, a verified student with proof of enrollment, or a writer in a region where the dollar conversion makes the plan disproportionately expensive), email us at faresadel@gmail.com and we will look at your case individually.",
      },
      {
        id: "annual-discount",
        question: "Are there annual discounts?",
        answer:
          "Yes. Pro yearly is $79.99 versus $107.88 if you paid monthly for 12 months, a 26 percent saving. Premium yearly is $159.99 versus $203.88 for 12 monthly payments, a 22 percent saving.",
      },
      {
        id: "payment-methods",
        question: "What payment methods do you accept?",
        answer:
          "Plotzy uses PayPal as its payment processor. PayPal supports both the PayPal account flow and direct credit-card payments that do not require a PayPal account. Both options run through the same checkout. Apple Pay support is on the roadmap for the production launch.",
      },
    ],
  },
  {
    id: "publishing-and-marketplace",
    title: "Publishing & Marketplace",
    description: "Publishing to the Community Library and what the Marketplace currently offers.",
    items: [
      {
        id: "publish-book",
        question: "How do I publish a book to the Community Library?",
        answer:
          "Open your book and use the publish action in the book's settings. The book becomes visible to other Plotzy readers in the Community Library, where it can be browsed by genre, liked, commented on, and rated. You can unpublish the book at any time and it disappears from the public library immediately.",
      },
      {
        id: "who-can-read",
        question: "Who can read my published books?",
        answer:
          "Any signed-in Plotzy user can read books in the Community Library. Viewing currently requires a Plotzy account; we do not show book content to anonymous web visitors.",
      },
      {
        id: "unpublish-book",
        question: "Can I unpublish or remove a book?",
        answer:
          "Yes. From the book's settings, the same publish toggle that put it in the Community Library can take it back out. The book and its chapters remain in your private library. If a book has reader engagement (likes, comments), unpublishing removes the public listing but the underlying engagement data is retained in case you republish later.",
      },
      {
        id: "what-is-marketplace",
        question: "What is the Marketplace?",
        answer:
          "The Marketplace today is a menu of AI-powered services applied to your manuscript: developmental editing, copy editing, beta-reader feedback, cover generation, and blurb writing. You commission a service against a specific book and receive structured feedback. The Premium plan includes 9 Marketplace analyses per month; Pro and Free can use them within their tier's limits.",
      },
      {
        id: "sell-my-books",
        question: "Will I be able to sell my books on Plotzy?",
        answer:
          "Direct book sales between writers and readers is on the roadmap, not currently available. The Marketplace today offers AI-powered services (developmental editing, copy editing, beta reading, cover generation, blurb writing) applied to your manuscript. When direct sales launch, Plotzy will not take a percentage of your earnings. Only standard payment-processor fees apply (charged by the processor, e.g., PayPal, not by Plotzy).",
      },
    ],
  },
  {
    id: "audiobook-studio",
    title: "Audiobook Studio",
    description: "Voices, export limits, and language coverage.",
    items: [
      {
        id: "audiobook-how",
        question: "How does the audiobook studio work?",
        answer:
          "Open any book and the audiobook studio reads through your chapters, generating audio with the voice and quality settings you choose. You can preview individual chapters with a live waveform, then export the full audiobook as a single MP3 file with embedded metadata. The studio uses OpenAI's text-to-speech models for production-quality narration.",
      },
      {
        id: "audiobook-voices",
        question: "How many voices are available?",
        answer:
          "Ten distinct AI voices are available: Nova, Alloy, Shimmer, Onyx, Echo, Fable, Coral, Ash, Ballad, and Sage. Each voice has documented gender, accent, and tonal characteristics so you can pick one that fits your protagonist or narrator. Reading speed adjusts continuously from a quarter speed to four times normal.",
      },
      {
        id: "audiobook-exports",
        question: "How many audiobooks can I export per month?",
        answer:
          "Free plans cannot export audiobooks; the browser preview using your device's built-in speech synthesis is available instead. Pro plans get 3 audiobook exports per month. Premium plans get 10 per month. Counts reset at the start of each calendar month.",
      },
      {
        id: "audiobook-languages",
        question: "What languages does the audiobook support?",
        answer:
          "The audiobook studio currently produces English audio with the highest fidelity. Multilingual support is on the roadmap; for languages where the OpenAI voices produce inconsistent quality, the studio recommends the browser-based preview as a fallback.",
      },
    ],
  },
  {
    id: "privacy-and-data",
    title: "Privacy & Data",
    description: "What we collect, where it lives, and how to remove it.",
    items: [
      {
        id: "writing-private",
        question: "Is my writing private?",
        answer:
          "Yes by default. Books are private to your account when you create them. They become visible to other Plotzy users only if you explicitly publish them to the Community Library, and you can unpublish at any time. Direct messages between users are visible only to the two participants.",
      },
      {
        id: "ai-training-detail",
        question: "Do you train AI on my content?",
        answer:
          "No. Plotzy does not use your books, chapters, or drafts to train AI models. Our AI usage log stores only the user ID, endpoint name, model name, prompt and completion token counts, estimated cost, and timestamp. The actual prompt content and the model's response are never written to our database.",
      },
      {
        id: "what-data-collected",
        question: "What data does Plotzy collect?",
        answer:
          "To run the platform, Plotzy stores your account information (email, display name, avatar URL, OAuth provider IDs), your books and chapters, payment receipts (PayPal order IDs, amounts, plan, status), AI usage counts (without content), notification records, follow graph, support messages, and aggregate page-view analytics with bot filtering. We do not collect or sell behavioral data to third parties.",
      },
      {
        id: "data-storage",
        question: "Where is my data stored?",
        answer:
          "Plotzy uses Neon, a serverless PostgreSQL database provider, as its primary data store. Connections are encrypted in transit. Email is sent through Resend; payments are processed by PayPal. AI requests go to OpenAI, which does not retain prompt content for training when called through their API.",
      },
      {
        id: "delete-account",
        question: "Can I delete my account?",
        answer:
          "Account deletion is available on request. Contact us at faresadel@gmail.com. When we delete your account, your profile, email, and personal data are permanently removed. Private drafts and unpublished material go away with the account. Books you previously published to the Community Library may remain as anonymous works, because other readers may have engaged with them through likes, comments, and reading lists. Removing those books would damage the experience for readers who never agreed to lose them. Self-service account deletion is on our roadmap.",
      },
    ],
  },
  {
    id: "account-and-technical",
    title: "Account & Technical",
    description: "Sign-in trouble, browser support, and how to reach us.",
    items: [
      {
        id: "forgot-password",
        question: "I forgot my password. What do I do?",
        answer:
          "On the sign-in screen, click Forgot Password and enter your account email. Plotzy sends a password reset link valid for a limited window. Open the email, click the link, and set a new password. If you signed up via Google, Apple, or LinkedIn, you don't have a Plotzy password. Sign in with the same provider you used originally.",
      },
      {
        id: "change-email",
        question: "How do I change my email?",
        answer:
          "From your Account page, you can update your display name and avatar. Email change is not currently a self-service action. If you need to change the email associated with your account, contact us at faresadel@gmail.com.",
      },
      {
        id: "browser-issues",
        question: "Plotzy isn't loading on my browser. What should I do?",
        answer:
          "Plotzy targets modern Chrome, Safari, Firefox, and Edge browsers from the past two years. If the application doesn't load, try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R), clearing your browser cache, or trying a different browser to isolate the issue. If the problem persists, contact us at faresadel@gmail.com with your browser version and operating system.",
      },
      {
        id: "contact-support",
        question: "How do I contact support?",
        answer:
          "Email us at faresadel@gmail.com or use the contact form on the Support page. We aim to respond within a business day for general questions and within a few hours for urgent issues affecting paying users. Premium subscribers receive priority support response.",
      },
    ],
  },
];

/**
 * Helper for the embedded /pricing FAQ section. Returns the
 * "Pricing & Subscriptions" category specifically so the pricing page
 * can render a focused subset without duplicating data.
 */
export function getPricingFaq(): FaqCategory | undefined {
  return FAQ_CATEGORIES.find((c) => c.id === "pricing");
}
