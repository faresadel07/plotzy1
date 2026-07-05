// Shared course presentation helpers.
//
// The whole course uses Apple's system typeface (SF Pro on Apple
// platforms, the platform UI font elsewhere) so it reads like a premium
// Apple-keynote experience and matches the rest of the Plotzy brand.
export const APPLE_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

// Replit generated one hero image per module (module-1..6.png) and one
// per lesson (lesson-<slug>.png), now bundled under /public/images/course.
// Modules are addressed by their 1..6 order; lessons carry their own
// heroImageUrl from the API (set in the DB).
export const moduleImage = (order: number) => `/images/course/module-${order}.png`;

// Pick the Arabic variant of a course field when the UI is Arabic and a
// translation exists; otherwise fall back to English. Every course
// surface goes through this so an untranslated row degrades gracefully
// instead of rendering blank.
export function arField(isRTL: boolean, en: string, ar?: string | null): string {
  return isRTL && ar ? ar : en;
}
