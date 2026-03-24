import { ACHIEVEMENT_DEFINITIONS, type AchievementDef } from "../../../lib/shared/src/achievements";
import { storage, type UserStats } from "./storage";

export async function checkAndUnlockAchievements(
  userId: number,
  stats: UserStats,
): Promise<AchievementDef[]> {
  const existing = await storage.getUserAchievements(userId);
  const unlockedIds = new Set(existing.map(a => a.achievementId));
  const totalViews = await storage.getUserTotalViews(userId);

  const toUnlock: AchievementDef[] = [];

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (unlockedIds.has(def.id)) continue;

    let shouldUnlock = false;

    switch (def.id) {
      case "words_5k":    shouldUnlock = stats.totalWordsWritten >= 5_000;     break;
      case "words_20k":   shouldUnlock = stats.totalWordsWritten >= 20_000;    break;
      case "words_60k":   shouldUnlock = stats.totalWordsWritten >= 60_000;    break;
      case "words_100k":  shouldUnlock = stats.totalWordsWritten >= 100_000;   break;
      case "words_1m":    shouldUnlock = stats.totalWordsWritten >= 1_000_000; break;
      case "first_chapter": shouldUnlock = stats.totalChaptersWritten >= 1;    break;
      case "first_publish": shouldUnlock = stats.totalBooksPublished >= 1;     break;
      case "views_100":   shouldUnlock = totalViews >= 100;                    break;
      case "views_1k":    shouldUnlock = totalViews >= 1_000;                  break;
      case "views_10k":   shouldUnlock = totalViews >= 10_000;                 break;
      case "streak_7":    shouldUnlock = stats.streakDays >= 7;                break;
      case "streak_30":   shouldUnlock = stats.streakDays >= 30;               break;
    }

    if (shouldUnlock) {
      const result = await storage.unlockAchievement(userId, def.id);
      if (result) toUnlock.push(def);
    }
  }

  return toUnlock;
}
