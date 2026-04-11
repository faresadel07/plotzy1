import { Router } from "express";
import { z } from "zod";
import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import multer from "multer";
import mammoth from "mammoth";
import { storage } from "../storage";
import { api } from "../../../../lib/shared/src/routes";
import { FREE_TRIAL_MAX_CHAPTERS, FREE_TRIAL_MAX_WORDS } from "../../../../lib/db/src/schema";
import { checkAndUnlockAchievements } from "../achievements-engine";
import { requireAuth, requireBookOwner, requireAdmin } from "../middleware/auth";
import { aiLimiter, imageGenLimiter } from "../middleware/rate-limit";
import { logger } from "../lib/logger";
import {
  isMockOpenAI,
  openai,
  isSubscriptionActive,
  getLangName,
  isRTL,
  escapeHtml,
  getChapterText,
  getChapterPages,
  stripHtml,
  isHtmlContent,
} from "./helpers";
import { cache } from "../lib/cache";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── List Books ─────────────────────────────────────────────────────────────

router.get(api.books.list.path, async (req, res) => {
  try {
    const sess = req.session as any;
    const rawGuestIds = (req.query.guestIds as string) || "";
    const queryGuestIds: number[] = rawGuestIds
      .split(",")
      .filter(Boolean)
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0);

    if (req.isAuthenticated() && req.user) {
      const userId = (req.user as any).id;
      const sessionGuestIds: number[] = sess.guestBookIds || [];
      const allGuestIds = [...new Set([...sessionGuestIds, ...queryGuestIds])];
      if (allGuestIds.length > 0) {
        await storage.claimGuestBooks(allGuestIds, userId);
        sess.guestBookIds = [];
      }
      const userBooks = await storage.getUserBooks(userId);
      return res.json(userBooks);
    }

    const sessionGuestIds: number[] = sess.guestBookIds || [];
    const allGuestIds = [...new Set([...sessionGuestIds, ...queryGuestIds])];

    if (allGuestIds.length > 0) {
      const guestBooks = await storage.getBooksByIds(allGuestIds);
      return res.json(guestBooks);
    }

    const allGuestBooks = await storage.getGuestBooks();
    return res.json(allGuestBooks);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// ─── Trash List ─────────────────────────────────────────────────────────────

router.get(api.books.trashList.path, async (req, res) => {
  try {
    const books = await storage.getDeletedBooks();
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// ─── Get Single Book ────────────────────────────────────────────────────────

router.get(api.books.get.path, async (req, res) => {
  try {
    const book = await storage.getBook(Number(req.params.id));
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// ─── Create Book ────────────────────────────────────────────────────────────

router.post(api.books.create.path, async (req, res) => {
  try {
    const input = api.books.create.input.parse(req.body);
    if (req.user) input.userId = (req.user as any).id;
    const book = await storage.createBook(input);
    if (!req.user) {
      const sess = req.session as any;
      if (!sess.guestBookIds) sess.guestBookIds = [];
      if (!sess.guestBookIds.includes(book.id)) sess.guestBookIds.push(book.id);
    }
    res.status(201).json(book);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: "Internal error" });
  }
});

// ─── Update Book (owner only) ───────────────────────────────────────────────

router.put(api.books.update.path, requireBookOwner, async (req, res) => {
  try {
    const input = api.books.update.input.parse(req.body);
    const book = await storage.updateBook(Number(req.params.id), input);
    res.json(book);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: "Internal error" });
  }
});

// ─── Soft-Delete / Restore (owner only) ─────────────────────────────────────

router.patch(api.books.trash.path, requireBookOwner, async (req, res) => {
  try {
    const book = await storage.updateBook(Number(req.params.id), {
      isDeleted: true,
    } as any);
    res.json(book);
  } catch {
    res.status(500).json({ message: "Internal error" });
  }
});

router.patch(api.books.restore.path, requireBookOwner, async (req, res) => {
  try {
    const book = await storage.updateBook(Number(req.params.id), {
      isDeleted: false,
    } as any);
    res.json(book);
  } catch {
    res.status(500).json({ message: "Internal error" });
  }
});

// ─── Permanent Delete (owner only) ──────────────────────────────────────────

router.delete(api.books.delete.path, requireBookOwner, async (req, res) => {
  try {
    await storage.deleteBook(Number(req.params.id));
    res.status(204).send();
  } catch {
    res.status(500).json({ message: "Internal error" });
  }
});

// ─── Publish / Unpublish ────────────────────────────────────────────────────

router.post("/api/books/:id/publish", async (req, res) => {
  try {
    const bookId = Number(req.params.id);
    const book = await storage.getBook(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const sess = req.session as any;
    const isAuthenticated = req.isAuthenticated() && req.user;
    const sessionGuestIds: number[] = sess.guestBookIds || [];
    const bodyGuestIds: number[] = Array.isArray(req.body?.guestIds)
      ? req.body.guestIds
      : [];
    const allGuestIds = [...new Set([...sessionGuestIds, ...bodyGuestIds])];
    const isGuestOwner =
      !isAuthenticated && book.userId === null && allGuestIds.includes(bookId);

    if (!isAuthenticated && !isGuestOwner) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (isAuthenticated) {
      const userId = (req.user as any).id;
      if (book.userId !== null && book.userId !== userId)
        return res.status(403).json({ message: "Forbidden" });
      if (book.userId === null)
        await storage.updateBook(bookId, { userId } as any);
    }

    const { publish } = req.body as { publish: boolean };
    const updated = await storage.publishBook(bookId, !!publish);

    // Bust public-library caches so readers see the change immediately
    await cache.invalidate("public:books");
    await cache.invalidate(`public:book:${bookId}`);
    await cache.invalidate("public:featured");

    if (isAuthenticated) {
      try {
        const userId = (req.user as any).id;
        if (publish && !book.isPublished) {
          await storage.incrementUserPublished(userId);
        } else if (!publish && book.isPublished) {
          await storage.decrementUserPublished(userId);
        }
        const stats = await storage.getOrCreateUserStats(userId);
        const newAchievements = await checkAndUnlockAchievements(userId, stats);
        return res.json({
          ...updated,
          newAchievements: newAchievements.map((a) => a.id),
        });
      } catch {
        return res.json(updated);
      }
    }

    return res.json(updated);
  } catch (err: any) {
    if (err.message === "EMPTY_BOOK") {
      return res.status(400).json({ message: "Book must have at least one chapter to publish" });
    }
    res.status(500).json({ message: "Internal error" });
  }
});

// ─── Public Library ─────────────────────────────────────────────────────────

router.get("/api/public/books/featured", async (_req, res) => {
  try {
    const book = await cache.getOrSet("public:featured", 300, () =>
      storage.getFeaturedBook(),
    );
    if (!book) return res.status(404).json({ message: "No featured book" });
    res.json(book);
  } catch {
    res.status(500).json({ message: "Internal error" });
  }
});

router.post(
  "/api/admin/books/:id/feature",
  requireAdmin,
  async (req, res) => {
    try {
      const bookId = Number(req.params.id);
      const { feature } = z
        .object({ feature: z.boolean() })
        .parse(req.body);
      await storage.setFeaturedBook(feature ? bookId : null);
      await cache.invalidate("public:featured");
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Internal error" });
    }
  }
);

router.get("/api/public/books", async (_req, res) => {
  try {
    const publishedBooks = await cache.getOrSet(
      "public:books",
      120, // 2-minute TTL — fresh enough for a library page
      () => storage.getPublishedBooks(),
    );
    res.json(publishedBooks);
  } catch {
    res.status(500).json({ message: "Internal error" });
  }
});

router.get("/api/public/books/:id", async (req, res) => {
  try {
    const bookId = Number(req.params.id);
    const book = await cache.getOrSet(
      `public:book:${bookId}`,
      120,
      () => storage.getPublishedBook(bookId),
    );
    if (!book || !book.isPublished)
      return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch {
    res.status(500).json({ message: "Internal error" });
  }
});

router.get("/api/public/books/:id/chapters", async (req, res) => {
  try {
    const book = await storage.getPublishedBook(Number(req.params.id));
    if (!book || !book.isPublished)
      return res.status(404).json({ message: "Book not found" });
    const chapterList = await storage.getPublishedBookChapters(
      Number(req.params.id)
    );
    res.json(chapterList);
  } catch {
    res.status(500).json({ message: "Internal error" });
  }
});

router.post("/api/public/books/:id/view", async (req, res) => {
  try {
    const bookId = Number(req.params.id);
    await storage.incrementBookViewCount(bookId);
    try {
      const book = await storage.getBook(bookId);
      if (book?.userId) {
        await storage.incrementUserViews(book.userId, 1);
        const stats = await storage.getOrCreateUserStats(book.userId);
        await checkAndUnlockAchievements(book.userId, stats);
      }
    } catch {
      /* non-blocking */
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Internal error" });
  }
});

// ─── Generate Book Cover (owner only) ───────────────────────────────────────

router.post(
  api.books.generateCover.path,
  requireBookOwner,
  imageGenLimiter,
  async (req, res) => {
    try {
      const { prompt, side } = api.books.generateCover.input.parse(req.body);
      const bookId = Number(req.params.id);
      const book = req.ownerBook!;

      const coverPrompt =
        side === "back"
          ? `A professional book back cover background image for a book titled "${book.title || "Novel"}". ${prompt}. Portrait orientation, simple and elegant, designed to sit behind text. Subtle, not too busy. No text overlaid on the image.`
          : `A stunning, professional book front cover for a book titled "${book.title || "Novel"}". ${prompt}. Portrait orientation, publication-quality artwork, cinematic and visually striking. The design should feel like a real published novel cover. No text or title overlaid on the image.`;

      if (isMockOpenAI) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const dummyUrl =
          "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=1024&auto=format&fit=crop";
        await storage.updateBook(
          bookId,
          side === "back"
            ? { backCoverImage: dummyUrl }
            : { coverImage: dummyUrl }
        );
        return res.json({ url: dummyUrl });
      }

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: coverPrompt,
        size: "1024x1536",
      });

      const b64 = response?.data?.[0]?.b64_json;
      if (!b64)
        return res.status(500).json({ message: "No image data returned" });

      const dataUri = `data:image/png;base64,${b64}`;
      if (side === "back") {
        await storage.updateBook(bookId, { backCoverImage: dataUri });
      } else {
        await storage.updateBook(bookId, { coverImage: dataUri });
      }

      res.json({ url: dataUri });
    } catch (err) {
      logger.error({ err }, "Books route error");
      res.status(500).json({ message: "Internal error" });
    }
  }
);

// ─── Generate Blurb (owner only) ────────────────────────────────────────────

router.post(
  api.books.generateBlurb.path,
  requireBookOwner,
  aiLimiter,
  async (req, res) => {
    try {
      const { language } = api.books.generateBlurb.input.parse(req.body);
      const bookId = Number(req.params.id);
      const book = req.ownerBook!;

      const langCode = language || book.language || "en";
      const langName = getLangName(langCode);
      const arabic = langCode === "ar";

      const chapters = await storage.getChapters(bookId);
      const chapterSummary = chapters
        .slice(0, 5)
        .map(
          (c, i) =>
            `Chapter ${i + 1} - ${c.title}: ${getChapterText(c.content).slice(0, 300)}`
        )
        .join("\n");

      const systemPrompt = arabic
        ? "أنت كاتب محترف متخصص في كتابة الأوصاف الجذابة للكتب. اكتب وصفاً قصيراً ومثيراً للاهتمام للغلاف الخلفي للكتاب (2-3 فقرات). يجب أن يكون الوصف جذاباً ويشجع القراء على قراءة الكتاب دون الكشف عن النهاية. أعد الوصف فقط."
        : `You are a professional book blurb writer. Write a captivating back-cover blurb for the book described below (2-3 short paragraphs). Make it intriguing and hook readers without spoiling the ending. Write in ${langName}. Return only the blurb text.`;

      const userContent = arabic
        ? `عنوان الكتاب: ${book.title}\nالمؤلف: ${book.authorName || "غير معروف"}\nالملخص: ${book.summary || "لا يوجد ملخص"}\n\nمحتوى الفصول:\n${chapterSummary || "لا توجد فصول بعد"}`
        : `Book Title: ${book.title}\nAuthor: ${book.authorName || "Unknown"}\nExisting Summary: ${book.summary || "None"}\n\nChapter Content:\n${chapterSummary || "No chapters yet"}`;

      if (isMockOpenAI) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const blurb =
          "This is a dummy AI-generated blurb explicitly created so you can test the UI and layout without needing an actual OpenAI API key. Once you provide your real API key in the `.env` file, this will dynamically analyze your chapters and world-building to output an incredibly compelling summary. For now, enjoy exploring the platform's visual design and animations!";
        await storage.updateBook(bookId, { summary: blurb });
        return res.json({ blurb });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });

      const blurb = response.choices[0]?.message?.content || "";
      await storage.updateBook(bookId, { summary: blurb });
      res.json({ blurb });
    } catch (err) {
      logger.error({ err }, "Books route error");
      res.status(500).json({ message: "Failed to generate blurb" });
    }
  }
);

// ─── Download Book ──────────────────────────────────────────────────────────

router.get("/api/books/:id/download", requireBookOwner, async (req, res) => {
  try {
    const bookId = Number(req.params.id);
    const format = (req.query.format as string) || "txt";
    const book = req.ownerBook!;
    const chapters = await storage.getChapters(bookId);
    const safeTitle =
      book.title
        .replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, "")
        .trim()
        .replace(/\s+/g, "_") || "book";

    if (format === "txt") {
      const lines: string[] = [
        book.title,
        book.authorName ? `by ${book.authorName}` : "",
        "",
        book.summary || "",
        "",
        "─".repeat(50),
        "",
      ];
      chapters.forEach((ch, i) => {
        lines.push(`Chapter ${i + 1}: ${ch.title}`);
        lines.push("");
        getChapterPages(ch.content).forEach((page, pi) => {
          if (pi > 0) {
            lines.push("");
            lines.push(`— Page ${pi + 1} —`);
            lines.push("");
          }
          lines.push(isHtmlContent(page) ? stripHtml(page) : page);
        });
        lines.push("");
        lines.push("─".repeat(50));
        lines.push("");
      });
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeTitle}.txt"`
      );
      return res.send(lines.join("\n"));
    }

    if (format === "pdf") {
      const langCode = book.language || "en";
      const rtl = isRTL(langCode);
      const dir = rtl ? "rtl" : "ltr";
      const template = (req.query.template as string) || "classic";
      const bookPages = (book as any).bookPages || {};

      const prefs =
        ((book as any).bookPreferences as Record<string, any>) || {};
      const prefFontKey = prefs.fontFamily || "eb-garamond";
      const prefFontSize = parseFloat(prefs.fontSize || "16") || 16;
      const prefLineHeight = prefs.lineHeight || "1.45";
      const prefPaperSize = prefs.paperSize || "a5";
      const prefMT = prefs.marginTop ?? 72;
      const prefMB = prefs.marginBottom ?? 72;
      const prefML = prefs.marginLeft ?? 72;
      const prefMR = prefs.marginRight ?? 72;

      const PAPER_CM: Record<string, { w: string; h: string }> = {
        a5: { w: "14.8cm", h: "21.0cm" },
        pocket: { w: "11.0cm", h: "18.0cm" },
        trade: { w: "15.24cm", h: "22.86cm" },
        a4: { w: "21.0cm", h: "29.7cm" },
      };
      const paperCm = PAPER_CM[prefPaperSize] || PAPER_CM["a5"];
      const pxToCm = (px: number) =>
        ((px / 96) * 2.54).toFixed(3) + "cm";

      const FONT_CSS: Record<string, string> = {
        "eb-garamond": "'EB Garamond', Georgia, serif",
        cormorant: "'Cormorant Garamond', Georgia, serif",
        "libre-baskerville": "'Libre Baskerville', Georgia, serif",
        lora: "'Lora', Georgia, serif",
        merriweather: "'Merriweather', Georgia, serif",
        "source-serif": "'Source Serif 4', Georgia, serif",
        playfair: "'Playfair Display', Georgia, serif",
        crimson: "'Crimson Text', Georgia, serif",
        georgia: "Georgia, serif",
        times: "'Times New Roman', Times, serif",
        inter: "'Inter', system-ui, sans-serif",
        roboto: "'Roboto', system-ui, sans-serif",
        "open-sans": "'Open Sans', system-ui, sans-serif",
        poppins: "'Poppins', system-ui, sans-serif",
        montserrat: "'Montserrat', system-ui, sans-serif",
        nunito: "'Nunito', system-ui, sans-serif",
        oswald: "'Oswald', system-ui, sans-serif",
        lexend: "'Lexend', system-ui, sans-serif",
        raleway: "'Raleway', system-ui, sans-serif",
        "courier-prime": "'Courier Prime', 'Courier New', monospace",
        "special-elite": "'Special Elite', cursive",
        "arabic-sans": "'Cairo', system-ui, sans-serif",
        "arabic-serif": "'Amiri', Georgia, serif",
        "arabic-naskh": "'Noto Naskh Arabic', Georgia, serif",
      };
      const FONT_IMPORT: Record<string, string> = {
        "eb-garamond":
          "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap",
        cormorant:
          "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap",
        "libre-baskerville":
          "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap",
        lora: "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap",
        merriweather:
          "https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&display=swap",
        "source-serif":
          "https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap",
        playfair:
          "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap",
        crimson:
          "https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap",
        inter:
          "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
        roboto:
          "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;1,400&display=swap",
        "open-sans":
          "https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,600;1,400&display=swap",
        poppins:
          "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap",
        montserrat:
          "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;1,400&display=swap",
        nunito:
          "https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,600;1,400&display=swap",
        oswald:
          "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&display=swap",
        lexend:
          "https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600&display=swap",
        raleway:
          "https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,400;0,600;1,400&display=swap",
        "courier-prime":
          "https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap",
        "special-elite":
          "https://fonts.googleapis.com/css2?family=Special+Elite&display=swap",
        "arabic-sans":
          "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap",
        "arabic-serif":
          "https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap",
        "arabic-naskh":
          "https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap",
      };

      const bodyFont =
        FONT_CSS[prefFontKey] || "'EB Garamond', Georgia, serif";
      const fontImportUrl =
        FONT_IMPORT[prefFontKey] || FONT_IMPORT["eb-garamond"];

      const TEMPLATES: Record<
        string,
        { headingFont: string; accentColor: string; chapterBorder: string }
      > = {
        classic: {
          headingFont: bodyFont,
          accentColor: "#8B6914",
          chapterBorder: "2px solid #D4AF37",
        },
        modern: {
          headingFont: "'Playfair Display', Georgia, serif",
          accentColor: "#1a1a1a",
          chapterBorder: "3px solid #111",
        },
        romance: {
          headingFont: bodyFont,
          accentColor: "#7a3535",
          chapterBorder: "1px solid #c9a0a0",
        },
      };
      const theme = TEMPLATES[template] || TEMPLATES.classic;

      // Front matter
      const frontMatterSections: string[] = [];
      if (bookPages.copyright) {
        frontMatterSections.push(
          `<div class="matter-page"><p class="matter-text">${escapeHtml(bookPages.copyright).replace(/\n/g, "<br>")}</p></div>`
        );
      } else {
        const autoC = `© ${new Date().getFullYear()} ${book.authorName || ""}. All rights reserved.\n\nPublished by Plotzy.\n\nNo part of this publication may be reproduced without permission.`;
        frontMatterSections.push(
          `<div class="matter-page"><p class="matter-text">${escapeHtml(autoC).replace(/\n/g, "<br>")}</p></div>`
        );
      }
      if (bookPages.dedication) {
        frontMatterSections.push(
          `<div class="matter-page matter-center"><p class="matter-text dedication">${escapeHtml(bookPages.dedication).replace(/\n/g, "<br>")}</p></div>`
        );
      }
      if (bookPages.epigraph) {
        frontMatterSections.push(
          `<div class="matter-page matter-center"><blockquote class="epigraph">${escapeHtml(bookPages.epigraph).replace(/\n/g, "<br>")}</blockquote></div>`
        );
      }
      const backMatterSections: string[] = [];
      if (bookPages.aboutAuthor) {
        backMatterSections.push(
          `<div class="matter-page"><h2>About the Author</h2><p class="matter-text">${escapeHtml(bookPages.aboutAuthor).replace(/\n/g, "<br>")}</p></div>`
        );
      }

      const chaptersHtml = chapters
        .map((ch, i) => {
          const contentHtml = getChapterPages(ch.content)
            .map((pg) =>
              isHtmlContent(pg)
                ? pg
                : escapeHtml(pg).replace(/\n/g, "<br>")
            )
            .join("");
          return `
          <div class="chapter">
            <h2>Chapter ${i + 1}: ${escapeHtml(ch.title)}</h2>
            <div class="chapter-content">${contentHtml}</div>
          </div>`;
        })
        .join("");

      const coverPageContent = book.coverImage
        ? `
            <div class="cover-image-wrap">
              <img src="${book.coverImage}" alt="Book Cover" class="cover-img" />
            </div>
            <div class="cover-text">
              <h1>${escapeHtml(book.title)}</h1>
              ${book.authorName ? `<div class="author">by ${escapeHtml(book.authorName)}</div>` : ""}
            </div>`
        : `
            <h1>${escapeHtml(book.title)}</h1>
            ${book.authorName ? `<div class="author">by ${escapeHtml(book.authorName)}</div>` : ""}
            ${book.summary ? `<div class="summary">${escapeHtml(book.summary)}</div>` : ""}`;

      const html = `<!DOCTYPE html>
<html lang="${langCode}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(book.title)}</title>
  <style>
    @import url('${fontImportUrl}');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${bodyFont};
      font-size: ${prefFontSize}px;
      line-height: ${prefLineHeight};
      color: #222;
      background: white;
      padding: 0;
      direction: ${dir};
    }
    .cover-page {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 100vh; page-break-after: always; text-align: center;
      background: ${book.coverImage ? "#000" : "#fff"}; padding: 0; position: relative; overflow: hidden;
    }
    .cover-image-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
    .cover-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.85; }
    .cover-text { position: relative; z-index: 2; padding: 40px; background: rgba(0,0,0,0.45); border-radius: 8px; }
    .cover-text h1 { font-size: 2.2em; font-weight: 700; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.8); margin-bottom: 12px; }
    .cover-text .author { font-size: 1.1em; color: rgba(255,255,255,0.85); font-style: italic; }
    .cover-page h1 { font-family: ${theme.headingFont}; font-size: 2em; font-weight: 700; margin-bottom: 16px; color: #1a1a1a; }
    .cover-page .author { font-size: 1.1em; color: #666; font-style: italic; margin-bottom: 32px; }
    .cover-page .summary { color: #444; max-width: 500px; line-height: 1.7; margin: 0 auto; padding: 0 40px; }
    .matter-page { padding: 10% 0; page-break-after: always; min-height: 60vh; display: flex; flex-direction: column; justify-content: center; }
    .matter-center { align-items: center; text-align: center; }
    .matter-text { line-height: 1.9; color: #444; }
    .matter-text.dedication { font-style: italic; color: #333; }
    .epigraph { font-style: italic; color: #555; border-left: 3px solid ${theme.accentColor}; padding-left: 20px; max-width: 400px; text-align: left; }
    .matter-page h2 { font-family: ${theme.headingFont}; font-size: 1.4em; margin-bottom: 20px; color: ${theme.accentColor}; border-bottom: ${theme.chapterBorder}; padding-bottom: 10px; }
    .chapter { padding: 0; page-break-before: always; }
    .chapter h2 { font-family: ${theme.headingFont}; font-size: 1.4em; margin-bottom: 1.5em; color: ${theme.accentColor}; border-bottom: ${theme.chapterBorder}; padding-bottom: 0.6em; }
    .chapter-content p { margin: 0 0 0.6em; }
    .chapter-content h1 { font-size: 2em; font-weight: 700; margin: 0.8em 0 0.4em; }
    .chapter-content h2 { font-size: 1.5em; font-weight: 700; margin: 0.75em 0 0.35em; }
    .chapter-content h3 { font-size: 1.25em; font-weight: 600; margin: 0.7em 0 0.3em; }
    .chapter-content ul, .chapter-content ol { padding-left: 1.5em; margin: 0.5em 0; }
    .chapter-content li { margin: 0.2em 0; }
    @media print {
      @page { size: ${paperCm.w} ${paperCm.h}; margin: ${pxToCm(prefMT)} ${pxToCm(prefMR)} ${pxToCm(prefMB)} ${pxToCm(prefML)}; }
    }
  </style>
</head>
<body>
  <div class="cover-page">${coverPageContent}</div>
  ${frontMatterSections.join("\n")}
  ${chaptersHtml}
  ${backMatterSections.join("\n")}
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }

    if (format === "epub") {
      // @ts-ignore
      const nodepub = await import("nodepub");

      let coverTmpPath = "";
      if (book.coverImage && book.coverImage.startsWith("data:image/")) {
        const match = book.coverImage.match(
          /^data:image\/(\w+);base64,(.+)$/
        );
        if (match) {
          const ext = match[1] === "jpeg" ? "jpg" : match[1];
          const b64data = match[2];
          coverTmpPath = path.join(
            os.tmpdir(),
            `plotzy-cover-${bookId}-${Date.now()}.${ext}`
          );
          fs.writeFileSync(coverTmpPath, Buffer.from(b64data, "base64"));
        }
      }

      const metadata = {
        id: `plotzy-book-${bookId}`,
        cover: coverTmpPath || "",
        title: book.title,
        series: "",
        sequence: 1,
        author: book.authorName || "Unknown Author",
        fileAs: book.authorName || "Unknown",
        genre: "Fiction",
        tags: "",
        copyright: `© ${new Date().getFullYear()} ${book.authorName || ""}`,
        publisher: "Plotzy",
        published: new Date().toISOString().split("T")[0],
        language: book.language || "en",
        description: book.summary || "",
        contents: "Table of Contents",
        source: "https://plotzy.app",
        images: [],
      };

      const doc = nodepub.document(metadata, "");

      if (book.summary) {
        doc.addSection(
          "About This Book",
          `<h2>About This Book</h2><p>${escapeHtml(book.summary)}</p>`
        );
      }

      chapters.forEach((ch, i) => {
        const pageHtml = getChapterPages(ch.content)
          .map((pg) =>
            isHtmlContent(pg)
              ? pg
              : `<p>${escapeHtml(pg).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`
          )
          .join("");
        doc.addSection(
          ch.title,
          `<h2>Chapter ${i + 1}: ${escapeHtml(ch.title)}</h2><div class="chapter-content">${pageHtml}</div>`
        );
      });

      const tmpPath = path.join(
        os.tmpdir(),
        `plotzy-${bookId}-${Date.now()}.epub`
      );
      await doc.compose(tmpPath);

      res.setHeader("Content-Type", "application/epub+zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeTitle}.epub"`
      );
      const stream = fs.createReadStream(tmpPath);
      stream.pipe(res);
      stream.on("end", () => {
        try {
          fs.unlinkSync(tmpPath);
        } catch {}
        if (coverTmpPath) {
          try {
            fs.unlinkSync(coverTmpPath);
          } catch {}
        }
      });
      return;
    }

    res.status(400).json({ message: "Unsupported format" });
  } catch (err) {
    logger.error({ err }, "Books route error");
    res.status(500).json({ message: "Failed to generate download" });
  }
});

// ─── Legacy Import (owner only) ─────────────────────────────────────────────

router.post(
  "/api/books/:bookId/legacy-import",
  requireBookOwner,
  upload.single("file"),
  async (req, res) => {
    try {
      const bookId = Number(req.params.bookId);

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileBuffer = req.file.buffer;
      const fileName = req.file.originalname.toLowerCase();
      let extractedText = "";

      if (fileName.endsWith(".pdf")) {
        // @ts-ignore
        const pdfParseModule = await import("pdf-parse");
        // @ts-ignore
        const parser = pdfParseModule.default || pdfParseModule;
        const data = await parser(fileBuffer);
        extractedText = data.text;
      } else if (fileName.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = result.value;
      } else {
        return res.status(400).json({
          message:
            "Unsupported file type. Please upload a PDF or DOCX file.",
        });
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({
          message: "No text could be extracted from the file.",
        });
      }

      await storage.createChapter({
        bookId,
        title: "Imported Chapter Draft",
        content: extractedText,
      });

      const sampleText = extractedText.slice(0, 40000);

      const systemPrompt = `You are an expert Story Analyst and Editor reading an imported manuscript.
Analyze the provided text and extract:
1. "characters": An array of important characters (name, and a short content/description paragraph). Category MUST be "character".
2. "beats": An array of story beats representing the plot progression (title, description, and columnId). The columnId MUST be one of "act1", "act2", or "act3".
Return a strict JSON object with these two arrays.`;

      if (isMockOpenAI) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await storage.createLoreEntry({
          bookId,
          name: "Protagonist (Imported)",
          category: "character",
          content: "Extracted hero from your legacy file.",
        });
        await storage.createStoryBeat({
          bookId,
          title: "Inciting Incident (Imported)",
          description: "The adventure begins mockingly.",
          columnId: "act1",
          order: 0,
        });
        return res.json({
          success: true,
          message: "Parsed and extracted Mock data successfully.",
        });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: sampleText },
        ],
        response_format: { type: "json_object" },
      });

      const resultStr =
        response.choices[0]?.message?.content || "{}";
      const resultObj = JSON.parse(resultStr);

      const characters = resultObj.characters || [];
      const beats = resultObj.beats || [];

      for (const char of characters) {
        if (char.name && char.content) {
          await storage.createLoreEntry({
            bookId,
            name: char.name,
            category: "character",
            content: char.content,
          });
        }
      }

      for (let i = 0; i < beats.length; i++) {
        const beat = beats[i];
        if (beat.title) {
          await storage.createStoryBeat({
            bookId,
            title: beat.title,
            description: beat.description || "",
            columnId: ["act1", "act2", "act3"].includes(beat.columnId)
              ? beat.columnId
              : "act1",
            order: i,
          });
        }
      }

      res.json({
        success: true,
        message: "Parsed text and extracted lore/beats successfully.",
      });
    } catch (err) {
      logger.error({ err }, "Legacy import error");
      res.status(500).json({
        message:
          "Failed to process the legacy file. It might be corrupted or too large.",
      });
    }
  }
);

// ─── ISBN (owner only) ──────────────────────────────────────────────────────

router.patch(
  "/api/books/:bookId/isbn",
  requireBookOwner,
  async (req: any, res: any) => {
    try {
      const bookId = Number(req.params.bookId);
      const { isbn } = z.object({ isbn: z.string() }).parse(req.body);
      const book = await storage.updateBook(bookId, { isbn } as any);
      res.json(book);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal error" });
    }
  }
);

export default router;
