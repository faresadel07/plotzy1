import { Router } from "express";
import multer from "multer";
import { storage } from "../storage";
import { logger } from "../lib/logger";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

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
    const { displayName, bio, website, twitterHandle, instagramHandle, avatarUrl } = req.body;
    const updates: Record<string, any> = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (website !== undefined) updates.website = website;
    if (twitterHandle !== undefined) updates.twitterHandle = twitterHandle;
    if (instagramHandle !== undefined) updates.instagramHandle = instagramHandle;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    const updated = await storage.updateUser(req.user.id, updates);
    const { passwordHash, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// POST /api/authors/:userId/follow
router.post("/api/authors/:userId/follow", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const targetId = Number(req.params.userId);
    if (isNaN(targetId)) return res.status(400).json({ message: "Invalid user ID" });
    if (targetId === req.user.id) return res.status(400).json({ message: "Cannot follow yourself" });

    await storage.followUser(req.user.id, targetId);
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
router.post("/api/books/:bookId/like", async (req, res) => {
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
router.post("/api/messages/:userId", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const receiverId = Number(req.params.userId);
    if (isNaN(receiverId)) return res.status(400).json({ message: "Invalid user ID" });

    const { content } = req.body;
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const message = await storage.sendMessage(req.user.id, receiverId, content.trim());

    // Notify the receiver
    const sender = await storage.getUserById(req.user.id);
    await storage.createNotification({
      userId: receiverId,
      type: "message",
      title: `New message from ${sender?.displayName || "Someone"}`,
      body: content.trim().substring(0, 100),
      actorId: req.user.id,
    });

    res.json(message);
  } catch (err) {
    res.status(500).json({ message: "Internal error" });
  }
});

// POST /api/messages/:userId/attachment — send image/file as base64 message
router.post("/api/messages/:userId/attachment", upload.single("file"), async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Not authenticated" });
    const receiverId = Number(req.params.userId);
    if (isNaN(receiverId)) return res.status(400).json({ message: "Invalid user ID" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

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
