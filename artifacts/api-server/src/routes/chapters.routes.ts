import { Router } from "express";
import { z } from "zod";
import express from "express";
import OpenAI, { toFile } from "openai";
import { storage } from "../storage";
import { api } from "../../../../lib/shared/src/routes";
import { FREE_TRIAL_MAX_CHAPTERS, FREE_TRIAL_MAX_WORDS } from "../../../../lib/db/src/schema";
import { checkAndUnlockAchievements } from "../achievements-engine";
import { requireBookOwner, requireChapterOwner } from "../middleware/auth";
import { aiLimiter } from "../middleware/rate-limit";
import {
  isMockOpenAI,
  openai,
  isSubscriptionActive,
  countWords,
  getLangName,
} from "./helpers";

const router = Router();

// ─── List Chapters ──────────────────────────────────────────────────────────

router.get(api.chapters.list.path, async (req, res) => {
  try {
    const chapters = await storage.getChapters(Number(req.params.bookId));
    res.json(chapters);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// ─── Create Chapter (enforces free trial limits) ────────────────────────────

router.post(api.chapters.create.path, requireBookOwner, async (req, res) => {
  try {
    const input = api.chapters.create.input.parse(req.body);
    const userId = req.isAuthenticated() && req.user ? req.user.id : null;

    // Enforce free trial chapter limit
    if (userId) {
      const dbUser = await storage.getUserById(userId);
      if (dbUser && !isSubscriptionActive(dbUser as any)) {
        const chapterCount = await storage.getUserChapterCount(userId);
        if (chapterCount >= FREE_TRIAL_MAX_CHAPTERS) {
          return res.status(403).json({
            message: "Free trial limit reached",
            code: "CHAPTER_LIMIT",
            limit: FREE_TRIAL_MAX_CHAPTERS,
          });
        }
      }
    }

    const chapter = await storage.createChapter({
      ...input,
      bookId: Number(req.params.bookId),
      userId: userId ?? undefined,
    });

    // Gamification: track first chapter achievement
    if (userId) {
      try {
        await storage.incrementUserChapters(userId);
        const stats = await storage.getOrCreateUserStats(userId);
        const newAchievements = await checkAndUnlockAchievements(
          userId,
          stats
        );
        return res.status(201).json({
          ...chapter,
          newAchievements: newAchievements.map((a) => a.id),
        });
      } catch {
        /* non-blocking */
      }
    }
    res.status(201).json(chapter);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: "Internal error" });
  }
});

// ─── Update Chapter (enforces free trial word limit) ────────────────────────

router.put(api.chapters.update.path, requireChapterOwner, async (req, res) => {
  try {
    const input = api.chapters.update.input.parse(req.body);
    const userId = req.isAuthenticated() && req.user ? req.user.id : null;

    // Enforce free trial word count limit
    if (userId && input.content) {
      const dbUser = await storage.getUserById(userId);
      if (dbUser && !isSubscriptionActive(dbUser as any)) {
        const wordCount = countWords(input.content);
        if (wordCount > FREE_TRIAL_MAX_WORDS) {
          return res.status(403).json({
            message: "Free trial word limit reached",
            code: "WORD_LIMIT",
            wordCount,
            limit: FREE_TRIAL_MAX_WORDS,
          });
        }
      }
    }

    const chapter = await storage.updateChapter(
      Number(req.params.id),
      input
    );

    // Gamification: track words written and streak
    if (userId && input.content) {
      try {
        const wordCount = countWords(input.content);
        const updatedStats = await storage.addWordsToUserStats(
          userId,
          wordCount
        );
        const streakStats = await storage.updateWritingStreak(userId);
        const merged = {
          ...updatedStats,
          streakDays: streakStats.streakDays,
          longestStreak: streakStats.longestStreak,
        };
        const newAchievements = await checkAndUnlockAchievements(
          userId,
          merged
        );
        return res.json({
          ...chapter,
          newAchievements: newAchievements.map((a) => a.id),
        });
      } catch {
        /* non-blocking */
      }
    }
    res.json(chapter);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: "Internal error" });
  }
});

// ─── Delete Chapter (owner only) ────────────────────────────────────────────

router.delete(
  api.chapters.delete.path,
  requireChapterOwner,
  async (req, res) => {
    try {
      await storage.deleteChapter(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  }
);

// ─── Reorder Chapters (owner only) ──────────────────────────────────────────

router.patch(
  "/api/books/:bookId/chapters/reorder",
  requireBookOwner,
  async (req, res) => {
    try {
      const body = z
        .object({
          updates: z.array(
            z.object({ id: z.number(), order: z.number() })
          ),
        })
        .parse(req.body);
      await storage.reorderChapters(body.updates);
      res.status(200).json({ ok: true });
    } catch (err) {
      if (err instanceof z.ZodError)
        return res
          .status(400)
          .json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal error" });
    }
  }
);

// ─── Daily Progress ─────────────────────────────────────────────────────────

router.get("/api/books/:bookId/progress", async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    const progress = await storage.getDailyProgress(bookId);
    res.json(progress);
  } catch {
    res.status(500).json({ message: "Internal error" });
  }
});

router.post("/api/books/:bookId/progress", async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    const { wordsAdded } = z
      .object({ wordsAdded: z.number() })
      .parse(req.body);
    const record = await storage.updateDailyProgress(bookId, wordsAdded);
    res.json(record);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({ message: err.errors[0].message });
    res.status(500).json({ message: "Internal error" });
  }
});

// ─── Voice Chapter (AI transcription + polish) ──────────────────────────────

const audioBodyParser = express.json({ limit: "50mb" });

router.post(
  api.chapters.voice.path,
  audioBodyParser,
  requireBookOwner,
  aiLimiter,
  async (req, res) => {
    try {
      const { audio } = api.chapters.voice.input.parse(req.body);
      const bookId = Number(req.params.bookId);
      const book = req.ownerBook!;
      const langCode = book.language || "en";
      const langName = getLangName(langCode);

      const audioBuffer = Buffer.from(audio, "base64");
      const file = await toFile(audioBuffer, "audio.webm", {
        type: "audio/webm",
      });
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: "gpt-4o-mini-transcribe",
        language: langCode.length === 2 ? langCode : undefined,
      });

      const transcribedText = transcription.text;

      const systemPrompt =
        langCode === "ar"
          ? "أنت كاتب أدبي محترف. حوّل النص التالي المنطوق إلى فصل أدبي متكامل ومنظم باللغة العربية الفصحى. ابدأ بعنوان وصفي."
          : `You are an expert ghostwriter. Turn the following spoken story into a well-structured, polished literary book chapter written in ${langName}. Provide only the chapter text, starting with a descriptive title.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcribedText },
        ],
      });

      const chapterContent =
        response.choices[0]?.message?.content || transcribedText;
      let title = "New Voice Chapter";
      const lines = chapterContent.split("\n");
      if (lines[0] && lines[0].length < 100) {
        title = lines[0]
          .replace(/^#+ /, "")
          .replace(/\*+/g, "")
          .trim();
      }

      const chapter = await storage.createChapter({
        bookId,
        title,
        content: chapterContent,
      });
      res.json(chapter);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to process voice" });
    }
  }
);

// ─── Transcribe Audio (inline dictation) ────────────────────────────────────

router.post(
  "/api/transcribe",
  audioBodyParser,
  aiLimiter,
  async (req, res) => {
    try {
      const { audio, language } = z
        .object({
          audio: z.string(),
          language: z.string().optional(),
        })
        .parse(req.body);

      const audioBuffer = Buffer.from(audio, "base64");
      const file = await toFile(audioBuffer, "audio.webm", {
        type: "audio/webm",
      });
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: "gpt-4o-mini-transcribe",
        language:
          language && language.length === 2 ? language : undefined,
      });

      res.json({ text: transcription.text });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Transcription failed" });
    }
  }
);

// ─── Chapter Snapshots / Version History ────────────────────────────────────
// (If you have snapshot routes in the main routes.ts, move them here too.
//  The hooks for saving snapshots live in the frontend performSave.)

export default router;
