import { createContext, useContext, useState, useEffect } from "react";
import type { Language, TranslationKey } from "@/lib/i18n";
import { getT, detectBrowserLanguage, RTL_LANGUAGES, UI_LANGUAGES } from "@/lib/i18n";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
  isRTL: false,
});

function getScriptClass(lang: Language): string {
  if (["zh"].includes(lang)) return "script-cjk-sc";
  if (["ja"].includes(lang)) return "script-cjk-jp";
  if (["ko"].includes(lang)) return "script-cjk-kr";
  if (["hi"].includes(lang)) return "script-devanagari";
  if (["ar", "fa", "ur"].includes(lang)) return "script-arabic";
  if (["he"].includes(lang)) return "script-hebrew";
  if (["ru", "uk", "bg", "sr"].includes(lang)) return "script-cyrillic";
  return "script-latin";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => detectBrowserLanguage());

  const isRTL = RTL_LANGUAGES.has(lang);

  useEffect(() => {
    localStorage.setItem("sw-lang", lang);
    const html = document.documentElement;
    html.dir = isRTL ? "rtl" : "ltr";
    html.lang = lang;

    const scriptClasses = [
      "script-latin",
      "script-arabic",
      "script-hebrew",
      "script-cjk-sc",
      "script-cjk-jp",
      "script-cjk-kr",
      "script-devanagari",
      "script-cyrillic",
    ];
    html.classList.remove(...scriptClasses);
    html.classList.add(getScriptClass(lang));
  }, [lang, isRTL]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
  };

  const t = getT(lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export { UI_LANGUAGES };
export type { Language, TranslationKey };
