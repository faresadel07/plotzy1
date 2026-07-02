// Floating bottom tab bar — the primary navigation on phones, in the
// Apple TV / iOS style: a translucent blurred pill hovering above the
// content with 5 destinations. Only rendered under the phone
// breakpoint (the caller gates on useIsPhone); desktop keeps its top
// nav completely untouched.

import { useLocation } from "wouter";
import { Home, PenLine, Headphones, BookOpen, Search } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';

interface Tab {
  key: string;
  labelEn: string;
  labelAr: string;
  icon: typeof Home;
  href: string;
  // A tab is "active" when the current path starts with any of these.
  match: string[];
}

const TABS: Tab[] = [
  { key: "home",   labelEn: "Home",    labelAr: "الرئيسيّة", icon: Home,       href: "/",             match: ["/"] },
  { key: "write",  labelEn: "Write",   labelAr: "اكتب",     icon: PenLine,     href: "/dashboard",    match: ["/dashboard", "/books", "/articles"] },
  { key: "listen", labelEn: "Listen",  labelAr: "استمع",    icon: Headphones,  href: "/audiolibrary", match: ["/audiolibrary"] },
  { key: "read",   labelEn: "Read",    labelAr: "اقرأ",     icon: BookOpen,    href: "/discover",     match: ["/discover", "/library", "/read"] },
  { key: "search", labelEn: "Search",  labelAr: "بحث",      icon: Search,      href: "/discover",     match: ["__never__"] },
];

export function MobileTabBar() {
  const [location, navigate] = useLocation();
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const isActive = (tab: Tab) => {
    if (tab.match.includes("/")) return location === "/";
    return tab.match.some((m) => m !== "/" && location.startsWith(m));
  };

  return (
    <nav
      dir={ar ? "rtl" : "ltr"}
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
        zIndex: 90,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        gap: 2,
        padding: "8px 6px",
        borderRadius: 24,
        background: "rgba(28,28,30,0.72)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        fontFamily: SF,
      }}
    >
      {TABS.map((tab) => {
        const active = isActive(tab);
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => navigate(tab.href)}
            aria-label={ar ? tab.labelAr : tab.labelEn}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              background: "transparent",
              border: "none",
              padding: "4px 0",
              cursor: "pointer",
              color: active ? "#fff" : "rgba(255,255,255,0.5)",
              transition: "color 160ms ease",
            }}
          >
            <Icon size={21} strokeWidth={active ? 2.5 : 2} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: "-0.01em" }}>
              {ar ? tab.labelAr : tab.labelEn}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
