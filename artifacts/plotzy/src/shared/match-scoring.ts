import type { Publisher } from "./publishers";
import type { LiteraryAgent } from "./agents";

export interface BookContext {
  genres: string[];
  languages: string[];
  wordCount: number;
  region?: string;
}

export interface MatchResult {
  score: number;
  reasons: string[];
  flags: string[];
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function intersect(a: string[], b: string[]): string[] {
  const normalizedB = new Set(b.map(normalize));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of a) {
    const key = normalize(item);
    if (normalizedB.has(key) && !seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function scorePublisher(pub: Publisher, ctx: BookContext): MatchResult {
  let score = 0;
  const reasons: string[] = [];
  const flags: string[] = [];

  const genreOverlap = intersect(pub.genres, ctx.genres);
  if (genreOverlap.length > 0) {
    score += 30;
    reasons.push(
      `Publishes ${genreOverlap.length} of your genres (${genreOverlap.join(", ")})`,
    );
  }

  if (ctx.genres.length > 0 && genreOverlap.length === ctx.genres.length) {
    score += 25;
    reasons.push("Covers every genre in your manuscript");
  }

  const languageOverlap = intersect(pub.languages, ctx.languages);
  if (languageOverlap.length > 0) {
    score += 20;
    reasons.push(`Accepts manuscripts in ${languageOverlap.join(", ")}`);
  } else {
    flags.push("No language overlap with your manuscript");
  }

  if (pub.acceptsUnsolicited) {
    score += 10;
    reasons.push("Open to unsolicited submissions");
  } else {
    flags.push("Does not accept unsolicited manuscripts");
  }

  if (ctx.region && pub.region === ctx.region) {
    score += 5;
    reasons.push(`Based in your region (${pub.region})`);
  }

  if (typeof pub.rating === "number" && pub.rating >= 4) {
    score += 5;
    reasons.push(`Highly rated publisher (${pub.rating.toFixed(1)} / 5)`);
  }

  return {
    score: clamp(Math.round(score), 0, 100),
    reasons,
    flags,
  };
}

export function scoreAgent(agent: LiteraryAgent, ctx: BookContext): MatchResult {
  let score = 0;
  const reasons: string[] = [];
  const flags: string[] = [];

  const genreOverlap = intersect(agent.genres, ctx.genres);
  if (genreOverlap.length > 0) {
    score += 35;
    reasons.push(
      `Represents ${genreOverlap.length} of your genres (${genreOverlap.join(", ")})`,
    );
  }

  if (ctx.genres.length > 0 && genreOverlap.length === ctx.genres.length) {
    score += 15;
    reasons.push("Covers every genre in your manuscript");
  }

  const languageOverlap = intersect(agent.languages, ctx.languages);
  if (languageOverlap.length > 0) {
    score += 20;
    reasons.push(`Works in ${languageOverlap.join(", ")}`);
  } else {
    flags.push("No language overlap with your manuscript");
  }

  if (agent.acceptsUnsolicited) {
    score += 10;
    reasons.push("Open to unsolicited queries");
  } else {
    flags.push("Does not accept unsolicited queries");
  }

  if (
    typeof agent.responseTimeWeeks === "number" &&
    agent.responseTimeWeeks <= 8
  ) {
    score += 15;
    reasons.push(`Typical response within ${agent.responseTimeWeeks} weeks`);
  }

  if (agent.manuscriptWishlist && ctx.genres.length > 0) {
    const wishlist = agent.manuscriptWishlist.toLowerCase();
    const matches = ctx.genres.filter((g) => wishlist.includes(g.toLowerCase()));
    if (matches.length > 0) {
      score += 5;
      reasons.push(`Wishlist mentions ${matches.join(", ")}`);
    }
  }

  if (ctx.region && agent.region === ctx.region) {
    score += 5;
    reasons.push(`Based in your region (${agent.region})`);
  }

  return {
    score: clamp(Math.round(score), 0, 100),
    reasons,
    flags,
  };
}

export function topMatches<T extends Publisher | LiteraryAgent>(
  items: T[],
  ctx: BookContext,
  scorer: (item: T, ctx: BookContext) => MatchResult,
  limit = 10,
): Array<{ item: T; match: MatchResult }> {
  return items
    .map((item) => ({ item, match: scorer(item, ctx) }))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, Math.max(0, limit));
}
