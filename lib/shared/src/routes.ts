import { z } from 'zod';
import {
  insertBookSchema, insertChapterSchema, insertLoreEntrySchema,
  insertStoryBeatSchema, books, chapters, loreEntries, dailyProgress, storyBeats
} from '../../db/src/schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  books: {
    list: {
      method: 'GET' as const,
      path: '/api/books' as const,
      responses: { 200: z.array(z.custom<typeof books.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/books/:id' as const,
      responses: {
        200: z.custom<typeof books.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    trashList: {
      method: 'GET' as const,
      path: '/api/books-trash' as const,
      responses: { 200: z.array(z.custom<typeof books.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/books' as const,
      input: insertBookSchema,
      responses: {
        201: z.custom<typeof books.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/books/:id' as const,
      input: insertBookSchema.partial(),
      responses: {
        200: z.custom<typeof books.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    trash: {
      method: 'PATCH' as const,
      path: '/api/books/:id/trash' as const,
      responses: {
        200: z.custom<typeof books.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    restore: {
      method: 'PATCH' as const,
      path: '/api/books/:id/restore' as const,
      responses: {
        200: z.custom<typeof books.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/books/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    generateCover: {
      method: 'POST' as const,
      path: '/api/books/:id/cover' as const,
      input: z.object({ prompt: z.string(), side: z.enum(['front', 'back']).default('front') }),
      responses: {
        200: z.object({ url: z.string() }),
        404: errorSchemas.notFound,
      }
    },
    generateBlurb: {
      method: 'POST' as const,
      path: '/api/books/:id/generate-blurb' as const,
      input: z.object({ language: z.string().optional() }),
      responses: {
        200: z.object({ blurb: z.string() }),
        404: errorSchemas.notFound,
      }
    }
  },
  chapters: {
    list: {
      method: 'GET' as const,
      path: '/api/books/:bookId/chapters' as const,
      responses: { 200: z.array(z.custom<typeof chapters.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/books/:bookId/chapters' as const,
      input: insertChapterSchema.omit({ bookId: true }),
      responses: {
        201: z.custom<typeof chapters.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/chapters/:id' as const,
      input: insertChapterSchema.partial(),
      responses: {
        200: z.custom<typeof chapters.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/chapters/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    voice: {
      method: 'POST' as const,
      path: '/api/books/:bookId/chapters/voice' as const,
      input: z.object({ audio: z.string() }),
      responses: {
        200: z.custom<typeof chapters.$inferSelect>(),
      }
    },
    reorder: {
      method: 'PATCH' as const,
      path: '/api/books/:bookId/chapters/reorder' as const,
      input: z.object({ updates: z.array(z.object({ id: z.number(), order: z.number() })) }),
      responses: { 200: z.object({ success: z.boolean() }) },
    },
  },
  lore: {
    list: {
      method: 'GET' as const,
      path: '/api/books/:bookId/lore' as const,
      responses: { 200: z.array(z.custom<typeof loreEntries.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/books/:bookId/lore' as const,
      input: insertLoreEntrySchema.omit({ bookId: true }),
      responses: {
        201: z.custom<typeof loreEntries.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/lore/:id' as const,
      input: insertLoreEntrySchema.partial(),
      responses: {
        200: z.custom<typeof loreEntries.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/lore/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    generate: {
      method: 'POST' as const,
      path: '/api/books/:bookId/lore/generate' as const,
      input: z.object({ language: z.string().optional() }),
      responses: {
        200: z.object({ success: z.boolean(), generatedCount: z.number() }),
        404: errorSchemas.notFound,
      }
    }
  },
  progress: {
    list: {
      method: 'GET' as const,
      path: '/api/books/:bookId/progress' as const,
      responses: { 200: z.array(z.custom<typeof dailyProgress.$inferSelect>()) },
    },
    update: {
      method: 'POST' as const,
      path: '/api/books/:bookId/progress' as const,
      input: z.object({ wordsAdded: z.number() }),
      responses: {
        200: z.custom<typeof dailyProgress.$inferSelect>(),
      }
    }
  },
  storyBeats: {
    list: {
      method: 'GET' as const,
      path: '/api/books/:bookId/story-beats' as const,
      responses: { 200: z.array(z.custom<typeof storyBeats.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/books/:bookId/story-beats' as const,
      input: insertStoryBeatSchema.omit({ bookId: true }),
      responses: {
        201: z.custom<typeof storyBeats.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/story-beats/:id' as const,
      input: insertStoryBeatSchema.partial(),
      responses: {
        200: z.custom<typeof storyBeats.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/story-beats/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    reorder: {
      method: 'POST' as const,
      path: '/api/books/:bookId/story-beats/reorder' as const,
      input: z.object({
        updates: z.array(z.object({
          id: z.number(),
          columnId: z.string(),
          order: z.number()
        }))
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
      }
    }
  },
  ai: {
    improve: {
      method: 'POST' as const,
      path: '/api/improve-text' as const,
      input: z.object({ text: z.string(), language: z.string().optional(), bookId: z.number().optional() }),
      responses: {
        200: z.object({ improvedText: z.string() }),
      }
    },
    expand: {
      method: 'POST' as const,
      path: '/api/expand-idea' as const,
      input: z.object({ idea: z.string(), language: z.string().optional(), bookId: z.number().optional() }),
      responses: {
        200: z.object({ expandedText: z.string() }),
      }
    },
    continueText: {
      method: 'POST' as const,
      path: '/api/continue-text' as const,
      input: z.object({ text: z.string(), language: z.string().optional(), bookId: z.number().optional() }),
      responses: {
        200: z.object({ continuedText: z.string() }),
      }
    },
    showDontTell: {
      method: 'POST' as const,
      path: '/api/show-dont-tell' as const,
      input: z.object({ text: z.string(), language: z.string().optional() }),
      responses: {
        200: z.object({
          findings: z.array(z.object({
            original: z.string(),
            suggestion: z.string(),
            type: z.string(),
          }))
        }),
      }
    },
    translate: {
      method: 'POST' as const,
      path: '/api/translate-text' as const,
      input: z.object({ text: z.string(), targetLanguage: z.string(), bookId: z.number().optional() }),
      responses: {
        200: z.object({ translatedText: z.string() }),
      }
    }
  },
  payments: {
    createIntent: {
      method: 'POST' as const,
      path: '/api/payments/create-intent' as const,
      input: z.object({ bookId: z.number() }),
      responses: {
        200: z.object({ clientSecret: z.string(), paymentIntentId: z.string() }),
      }
    },
    confirm: {
      method: 'POST' as const,
      path: '/api/payments/confirm' as const,
      input: z.object({ bookId: z.number(), paymentIntentId: z.string() }),
      responses: {
        200: z.object({ success: z.boolean() }),
      }
    }
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
