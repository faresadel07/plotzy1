// Type-safe API route definitions for the Plotzy client
export const api = {
  books: {
    list: { method: 'GET' as const, path: '/api/books' as const },
    get: { method: 'GET' as const, path: '/api/books/:id' as const },
    trashList: { method: 'GET' as const, path: '/api/books-trash' as const },
    create: { method: 'POST' as const, path: '/api/books' as const },
    update: { method: 'PUT' as const, path: '/api/books/:id' as const },
    trash: { method: 'PATCH' as const, path: '/api/books/:id/trash' as const },
    restore: { method: 'PATCH' as const, path: '/api/books/:id/restore' as const },
    delete: { method: 'DELETE' as const, path: '/api/books/:id' as const },
    generateCover: { method: 'POST' as const, path: '/api/books/:id/cover' as const },
    generateBlurb: { method: 'POST' as const, path: '/api/books/:id/generate-blurb' as const },
    togglePublish: { method: 'PATCH' as const, path: '/api/books/:id/publish' as const },
    shareToken: { method: 'GET' as const, path: '/api/books/:shareToken/share' as const },
    rateLimit: { method: 'GET' as const, path: '/api/books/:bookId/rate-limit' as const },
    duplicate: { method: 'POST' as const, path: '/api/books/:id/duplicate' as const },
  },
  chapters: {
    list: { method: 'GET' as const, path: '/api/books/:bookId/chapters' as const },
    create: { method: 'POST' as const, path: '/api/books/:bookId/chapters' as const },
    update: { method: 'PUT' as const, path: '/api/chapters/:id' as const },
    delete: { method: 'DELETE' as const, path: '/api/chapters/:id' as const },
    voice: { method: 'POST' as const, path: '/api/books/:bookId/chapters/voice' as const },
    reorder: { method: 'PATCH' as const, path: '/api/books/:bookId/chapters/reorder' as const },
  },
  lore: {
    list: { method: 'GET' as const, path: '/api/books/:bookId/lore' as const },
    create: { method: 'POST' as const, path: '/api/books/:bookId/lore' as const },
    update: { method: 'PUT' as const, path: '/api/lore/:id' as const },
    delete: { method: 'DELETE' as const, path: '/api/lore/:id' as const },
  },
  storyBeats: {
    list: { method: 'GET' as const, path: '/api/books/:bookId/story-beats' as const },
    create: { method: 'POST' as const, path: '/api/books/:bookId/story-beats' as const },
    update: { method: 'PUT' as const, path: '/api/story-beats/:id' as const },
    delete: { method: 'DELETE' as const, path: '/api/story-beats/:id' as const },
    reorder: { method: 'PATCH' as const, path: '/api/books/:bookId/story-beats/reorder' as const },
  },
  auth: {
    me: { method: 'GET' as const, path: '/api/auth/me' as const },
    logout: { method: 'POST' as const, path: '/api/auth/logout' as const },
    updateProfile: { method: 'PATCH' as const, path: '/api/auth/profile' as const },
  },
  ai: {
    plotHoles: { method: 'POST' as const, path: '/api/books/:bookId/ai/plot-holes' as const },
    dialogueCoach: { method: 'POST' as const, path: '/api/books/:bookId/ai/dialogue-coach' as const },
    pacingAnalysis: { method: 'POST' as const, path: '/api/books/:bookId/ai/pacing-analysis' as const },
    continueText: { method: 'POST' as const, path: '/api/continue-text' as const },
    translate: { method: 'POST' as const, path: '/api/translate-text' as const },
  },
  payments: {
    createIntent: { method: 'POST' as const, path: '/api/payments/create-intent' as const },
    confirm: { method: 'POST' as const, path: '/api/payments/confirm' as const },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
