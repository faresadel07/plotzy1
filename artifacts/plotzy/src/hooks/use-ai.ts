import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/routes";
import { parseWithLogging } from "./use-zod-logger";

export function useImproveText() {
  return useMutation({
    mutationFn: async ({ text, language }: { text: string; language?: string }) => {
      const res = await fetch(api.ai.improve.path, {
        method: api.ai.improve.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to improve text");
      const data = await res.json();
      return parseWithLogging(api.ai.improve.responses[200], data, "ai.improve");
    },
  });
}

export function useExpandIdea() {
  return useMutation({
    mutationFn: async ({ idea, language }: { idea: string; language?: string }) => {
      const res = await fetch(api.ai.expand.path, {
        method: api.ai.expand.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, language }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to expand idea");
      const data = await res.json();
      return parseWithLogging(api.ai.expand.responses[200], data, "ai.expand");
    },
  });
}

export function useContinueText() {
  return useMutation({
    mutationFn: async ({ text, language }: { text: string; language?: string }) => {
      const res = await fetch(api.ai.continueText.path, {
        method: api.ai.continueText.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to continue text");
      const data = await res.json();
      return parseWithLogging(api.ai.continueText.responses[200], data, "ai.continueText");
    },
  });
}

export function useTranslateText() {
  return useMutation({
    mutationFn: async ({ text, targetLanguage }: { text: string; targetLanguage: string }) => {
      const res = await fetch(api.ai.translate.path, {
        method: api.ai.translate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to translate text");
      const data = await res.json();
      return parseWithLogging(api.ai.translate.responses[200], data, "ai.translate");
    },
  });
}
