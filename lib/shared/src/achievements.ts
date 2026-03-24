export type AchievementCategory = "writing" | "milestone" | "views" | "streak";

export type AchievementDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  threshold?: number;
  rarity: "common" | "rare" | "epic" | "legendary";
};

export const ACHIEVEMENT_DEFINITIONS: AchievementDef[] = [
  { id: "words_5k",   name: "Apprentice Scribe",    description: "Write your first 5,000 words",    icon: "✍️", category: "writing",   threshold: 5000,    rarity: "common" },
  { id: "words_20k",  name: "Journeyman Writer",     description: "Write 20,000 words",              icon: "📝", category: "writing",   threshold: 20000,   rarity: "common" },
  { id: "words_60k",  name: "Novel Crafter",         description: "Write 60,000 words",              icon: "📖", category: "writing",   threshold: 60000,   rarity: "rare" },
  { id: "words_100k", name: "Century Author",        description: "Write 100,000 words",             icon: "🏆", category: "writing",   threshold: 100000,  rarity: "epic" },
  { id: "words_1m",   name: "Legendary Wordsmith",  description: "Write 1,000,000 words",           icon: "👑", category: "writing",   threshold: 1000000, rarity: "legendary" },

  { id: "first_chapter", name: "First Words",       description: "Write your very first chapter",   icon: "🌱", category: "milestone",                      rarity: "common" },
  { id: "first_publish", name: "Published!",        description: "Publish your first book",         icon: "🚀", category: "milestone",                      rarity: "rare" },

  { id: "views_100",  name: "Rising Voice",         description: "Reach 100 views on your work",    icon: "👁️", category: "views",     threshold: 100,     rarity: "common" },
  { id: "views_1k",   name: "Emerging Author",      description: "Reach 1,000 views on your work",  icon: "⭐", category: "views",     threshold: 1000,    rarity: "rare" },
  { id: "views_10k",  name: "Beloved Storyteller",  description: "Reach 10,000 views on your work", icon: "🌟", category: "views",     threshold: 10000,   rarity: "epic" },

  { id: "streak_7",   name: "Week of Words",        description: "Maintain a 7-day writing streak", icon: "🔥", category: "streak",    threshold: 7,       rarity: "common" },
  { id: "streak_30",  name: "Month of Mastery",     description: "Maintain a 30-day writing streak",icon: "💎", category: "streak",    threshold: 30,      rarity: "legendary" },
];

export const LEVEL_THRESHOLDS = [0, 0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500];

export function computeXp(totalWords: number, totalBooksPublished: number, totalViews: number): number {
  return Math.floor(totalWords / 100) + totalBooksPublished * 5 + Math.floor(totalViews / 100);
}

export function computeLevel(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i;
    else break;
  }
  return level;
}

export function xpForNextLevel(level: number): number {
  return LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length - 1)] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

export function xpForCurrentLevel(level: number): number {
  return LEVEL_THRESHOLDS[Math.min(level - 1, LEVEL_THRESHOLDS.length - 1)] ?? 0;
}
