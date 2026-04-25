import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { storage } from "../storage";
import { logger } from "../lib/logger";
import { sendNotificationEmail } from "../lib/email";
import { requireEmailVerified } from "../middleware/auth";

// Extract the bare handle from any common paste form — bare handle,
// @-prefixed, or a full profile URL with or without protocol. Keeps
// what we store canonical (just the handle) so the display code
// doesn't have to second-guess the format at render time.
//
// `pathPrefix` lets us handle LinkedIn's /in/ segment (profile URLs
// look like linkedin.com/in/some-name); Twitter/Instagram put the
// handle directly at the root so the prefix is empty.
//
// `charset` differs per platform: Instagram and Twitter are A-Za-z0-9._
// while LinkedIn handles allow hyphens too.
function extractHandle(
  raw: string,
  domain: string,
  opts: { pathPrefix?: string; charset?: RegExp; maxLen?: number } = {},
): string | null {
  const { pathPrefix = "", charset = /^[A-Za-z0-9._]+$/, maxLen = 30 } = opts;
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const urlRe = new RegExp(
    `^(?:https?://)?(?:[a-z]+\\.)?${domain}/+${pathPrefix}(?:@)?([^/?#\\s]+)`,
    "i",
  );
  const m = trimmed.match(urlRe);
  const handle = m ? m[1] : trimmed.replace(/^@/, "");
  if (handle.length > maxLen || !charset.test(handle)) return null;
  return handle;
}

// SECURITY: /api/me/profile accepts avatarUrl and bannerUrl as strings.
// Without a schema, an authenticated user could post a 10MB (Express body
// limit) data URI and inflate their row in the users table — or store a
// javascript:... URL in `website` that any future integration trusting
// the stored value would execute. These caps match the dedicated
// /api/auth/avatar endpoint (250KB avatar) but allow a larger banner.
//
// Social handles accept up to 200 chars of input (room for full URLs
// like `https://www.instagram.com/name/?utm_source=...`) but transform
// to just the canonical handle before storage. Input that cannot be
// parsed into a valid platform handle returns a clear error rather
// than silently rejecting the whole profile save.
const socialHandleSchema = (
  domain: "instagram.com" | "twitter.com" | "x.com" | "linkedin.com",
  opts: { pathPrefix?: string; charset?: RegExp; maxLen?: number } = {},
) =>
  z.string().max(200).transform((raw, ctx) => {
    const h = extractHandle(raw, domain, opts);
    if (h === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid ${domain.split(".")[0]} handle or URL` });
      return z.NEVER;
    }
    return h;
  });

const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(50).optional(),
  bio: z.string().max(200).optional(),
  website: z
    .string()
    .max(500)
    .transform(raw => {
      const s = raw.trim();
      if (!s) return s;
      // Accept missing scheme — normalise so the stored value is always
      // a safe http(s) URL. Matches what safeExternalUrl() does on the
      // client so the round-trip is lossless.
      if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
      return `https://${s}`;
    })
    .refine(v => !v || /^https?:\/\//i.test(v), "website must be an http or https URL")
    .optional(),
  twitterHandle: z.union([socialHandleSchema("twitter.com"), socialHandleSchema("x.com")]).optional(),
  instagramHandle: socialHandleSchema("instagram.com").optional(),
  avatarUrl: z
    .string()
    .max(250_000)
    .refine(
      v => v.startsWith("data:image/") || (v.startsWith("http") && v.length < 2048),
      "avatar must be an image data URI (≤200KB) or a URL",
    )
    .optional(),
  bannerUrl: z
    .string()
    .max(1_500_000)
    .refine(
      v => v.startsWith("data:image/") || (v.startsWith("http") && v.length < 2048),
      "banner must be an image data URI (≤1MB) or a URL",
    )
    .optional(),
});

const router = Router();

// SECURITY: per-(sender,recipient) message rate limit. Without this a
// single authenticated account can spam any other user with up to
// 6.7MB base64 attachments every request — quickly filling the
// recipient's inbox UI and bloating the direct_messages table. We
// cap at 20 messages / minute per direction. This is a process-local
// sliding window; a proper solution uses Redis, but this blocks the
// naive abuse path with zero infra cost.
const MESSAGE_RATE_WINDOW_MS = 60_000;
const MESSAGE_RATE_MAX = 20;
const messageRateBuckets = new Map<string, number[]>();
function allowMessage(senderId: number, recipientId: number): boolean {
  const key = `${senderId}->${recipientId}`;
  const now = Date.now();
  const recent = (messageRateBuckets.get(key) ?? []).filter(
    t => now - t < MESSAGE_RATE_WINDOW_MS,
  );
  if (recent.length >= MESSAGE_RATE_MAX) return false;
  recent.push(now);
  messageRateBuckets.set(key, recent);
  // Occasionally purge stale keys so the map doesn't grow unbounded.
  if (messageRateBuckets.size > 10_000) {
    for (const [k, v] of messageRateBuckets) {
      if (v.every(t => now - t >= MESSAGE_RATE_WINDOW_MS)) messageRateBuckets.delete(k);
    }
  }
  return true;
}

const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain", "application/epub+zip", "application/rtf",
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_FILE_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error("File type not allowed"));
  },
});

// ── Social: Author Profiles, Follows, Notifications, Messages ─────────

// GET /api/authors/:userId/profile — public author profile
router.get("/api/authors/:userId/profile", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });

    const user = await storage.getUserById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { passwordHash, stripeCustomerId, stripeSubscriptionId, subscriptionStatus, subscriptionPlan, subscriptionEndDate, googleId, appleId, linkedinId, facebookId, suspended, ...publicUser } = user;

    const userBooks = await storage.getUserBooks(userId);
    const publishedBooks = userBooks.filter(b => b.isPublished && !b.isDeleted);

    const [followersCount, followingCount, totalLikes] = await Promise.all([
      storage.getFollowersCount(userId),
      storage.getFollowingCount(userId),
      storage.getAuthorTotalLikes(userId),
    ]);

    // Get like count per book
    const booksWithLikes = await Promise.all(publishedBooks.map(async (b) => ({
      ...b,
      likesCount: await storage.getBookLikesCount(b.id),
    })));

    let isFollowing = false;
    if (req.isAuthenticated() && req.user) {
      isFollowing = await storage.isFollowing(req.user.id, userId);
    }

    res.json({ ...publicUser, books: booksWithLikes, followersCount, followingCount, totalLikes, isFollowing });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// PATCH /api/me/profile — update own profile
router.patch("/api/me/profile", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    // Zod strips unknown fields (no mass-assignment via role/email/stripe*)
    // AND enforces every field's length + scheme, so the endpoint can no
    // longer be used to stuff 10MB payloads or stored-javascript URLs
    // into the user row.
    const updates = profileUpdateSchema.parse(req.body);
    const updated = await storage.updateUser(req.user.id, updates);
    const { passwordHash, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    res.status(500).json({ message: "Internal error" });
  }
});

// POST /api/authors/:userId/follow
router.post("/api/authors/:userId/follow", requireEmailVerified, async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const targetId = Number(req.params.userId);
    if (isNaN(targetId)) return res.status(400).json({ message: "Invalid user ID" });
    if (targetId === req.user.id) return res.status(400).json({ message: "Cannot follow yourself" });

    await storage.followUser(req.user.id, targetId);

    // Email notification on new follower
    const follower = await storage.getUserById(req.user.id);
    const target = await storage.getUserById(targetId);
    if (target?.email) {
      sendNotificationEmail(target.email, `${follower?.displayName || "Someone"} started following you`, `You have a new follower on Plotzy! Check out their profile.`).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// DELETE /api/authors/:userId/follow
router.delete("/api/authors/:userId/follow", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const targetId = Number(req.params.userId);
    if (isNaN(targetId)) return res.status(400).json({ message: "Invalid user ID" });

    await storage.unfollowUser(req.user.id, targetId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// ── Book Likes ─────────────────────────────────────────────────────

// POST /api/books/:bookId/like
router.post("/api/books/:bookId/like", requireEmailVerified, async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
    const bookId = Number(req.params.bookId);
    if (isNaN(bookId)) return res.status(400).json({ message: "Invalid book ID" });
    await storage.likeBook(req.user.id, bookId);
    const likesCount = await storage.getBookLikesCount(bookId);
    res.json({ liked: true, likesCount });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// DELETE /api/books/:bookId/like
router.delete("/api/books/:bookId/like", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
    const bookId = Number(req.params.bookId);
    if (isNaN(bookId)) return res.status(400).json({ message: "Invalid book ID" });
    await storage.unlikeBook(req.user.id, bookId);
    const likesCount = await storage.getBookLikesCount(bookId);
    res.json({ liked: false, likesCount });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/books/:bookId/like — check if current user liked + count
router.get("/api/books/:bookId/like", async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    if (isNaN(bookId)) return res.status(400).json({ message: "Invalid book ID" });
    const likesCount = await storage.getBookLikesCount(bookId);
    let liked = false;
    if (req.isAuthenticated() && req.user) {
      liked = await storage.isBookLiked(req.user.id, bookId);
    }
    res.json({ liked, likesCount });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/notifications
router.get("/api/notifications", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const notifs = await storage.getNotifications(req.user.id, 50);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/notifications/unread-count
router.get("/api/notifications/unread-count", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const count = await storage.getUnreadNotificationCount(req.user.id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// PATCH /api/notifications/:id/read
router.patch("/api/notifications/:id/read", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid notification ID" });

    await storage.markNotificationRead(id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// POST /api/notifications/read-all
router.post("/api/notifications/read-all", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    await storage.markAllNotificationsRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/messages/unread-count (must be before /api/messages/:userId)
router.get("/api/messages/unread-count", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const count = await storage.getUnreadMessageCount(req.user.id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/messages/conversations
router.get("/api/messages/conversations", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const conversations = await storage.getConversations(req.user.id);
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// GET /api/messages/:userId
router.get("/api/messages/:userId", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const otherUserId = Number(req.params.userId);
    if (isNaN(otherUserId)) return res.status(400).json({ message: "Invalid user ID" });

    const messages = await storage.getMessages(req.user.id, otherUserId, 100);
    // Mark messages from the other user as read
    await storage.markMessagesRead(req.user.id, otherUserId);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// POST /api/messages/:userId
router.post("/api/messages/:userId", requireEmailVerified, async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const receiverId = Number(req.params.userId);
    if (isNaN(receiverId)) return res.status(400).json({ message: "Invalid user ID" });

    if (!allowMessage(req.user.id, receiverId)) {
      return res.status(429).json({ message: "Too many messages to this user. Slow down for a minute." });
    }

    const { content } = req.body;
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const message = await storage.sendMessage(req.user.id, receiverId, content.trim());

    // Notify the receiver
    const sender = await storage.getUserById(req.user.id);
    const senderName = sender?.displayName || "Someone";
    await storage.createNotification({
      userId: receiverId,
      type: "message",
      title: `New message from ${senderName}`,
      body: content.trim().substring(0, 100),
      actorId: req.user.id,
    });

    // Send email notification
    const receiver = await storage.getUserById(receiverId);
    if (receiver?.email) {
      sendNotificationEmail(receiver.email, `New message from ${senderName}`, `${senderName} sent you a message: "${content.trim().substring(0, 200)}"`).catch(() => {});
    }

    res.json(message);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// POST /api/messages/:userId/attachment — send image/file as base64 message
router.post("/api/messages/:userId/attachment", requireEmailVerified, upload.single("file"), async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
    const receiverId = Number(req.params.userId);
    if (isNaN(receiverId)) return res.status(400).json({ message: "Invalid user ID" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    if (!allowMessage(req.user.id, receiverId)) {
      return res.status(429).json({ message: "Too many messages to this user. Slow down for a minute." });
    }

    const { originalname, mimetype, buffer } = req.file;
    const base64 = buffer.toString("base64");
    const isImage = mimetype.startsWith("image/");
    // Store as special content format: [FILE:type:name:data] or [IMG:data]
    const content = isImage
      ? `[IMG:${mimetype}:${originalname}:${base64}]`
      : `[FILE:${mimetype}:${originalname}:${base64}]`;

    const message = await storage.sendMessage(req.user.id, receiverId, content);

    const sender = await storage.getUserById(req.user.id);
    await storage.createNotification({
      userId: receiverId,
      type: "message",
      title: `${sender?.displayName || "Someone"} sent you ${isImage ? "an image" : "a file"}`,
      body: originalname,
      actorId: req.user.id,
    });

    res.json(message);
  } catch (err) {
    logger.error({ err }, "Attachment upload error");
    res.status(500).json({ message: "Failed to send attachment" });
  }
});

export default router;
