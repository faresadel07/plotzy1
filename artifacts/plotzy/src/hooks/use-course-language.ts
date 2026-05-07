import { useCallback, useEffect, useState } from "react";

/**
 * Course-only language preference. Independent from the global UI
 * language (sw-lang) so a user can read the course in Arabic while
 * keeping the rest of Plotzy in English (or vice-versa).
 *
 * Currently a binary toggle (en/ar) because Arabic is the only
 * non-English course translation that exists. Returning a string
 * leaves room to grow without breaking callers when more
 * translations land.
 *
 * Storage key is intentionally distinct from sw-lang so the two
 * preferences never overwrite each other.
 */
const STORAGE_KEY = "plotzy-course-lang";
const SUPPORTED: readonly string[] = ["en", "ar"];

export type CourseLang = "en" | "ar";

function readInitial(): CourseLang {
  if (typeof window === "undefined") return "en";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && SUPPORTED.includes(raw)) return raw as CourseLang;
  } catch {
    /* storage blocked — fall through to default */
  }
  return "en";
}

export function useCourseLanguage(): {
  courseLang: CourseLang;
  setCourseLang: (lang: CourseLang) => void;
  isCourseRTL: boolean;
} {
  const [courseLang, setCourseLangState] = useState<CourseLang>(readInitial);

  // Cross-tab sync: if the user toggles language in another tab, the
  // storage event fires and we update.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue && SUPPORTED.includes(e.newValue) ? (e.newValue as CourseLang) : "en";
      setCourseLangState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setCourseLang = useCallback((lang: CourseLang) => {
    setCourseLangState(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage blocked — UI still updates for this tab */
    }
  }, []);

  return {
    courseLang,
    setCourseLang,
    isCourseRTL: courseLang === "ar",
  };
}
