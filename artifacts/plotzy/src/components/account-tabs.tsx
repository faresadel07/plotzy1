import { Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";

// Sibling-page strip rendered at the top of /account/subscription
// and /account/settings. Lets the user hop between billing and
// account management without going back to the dropdown menu.
//
// The active tab gets a 2px underline in the brand white; the
// inactive tab is muted and brightens on hover. Wouter's Link
// preserves SPA navigation so React Query caches survive the hop.
const T = "#2f2618";
const TS = "#7b7366";
const B = "rgba(66,53,33,0.15)";

type Tab = "subscription" | "settings";

export function AccountTabs({ current }: { current: Tab }) {
  const { t } = useLanguage();
  const tabs: Array<{ id: Tab; href: string; label: string }> = [
    { id: "subscription", href: "/account/subscription", label: t("mySubscription") },
    { id: "settings", href: "/account/settings", label: t("mySettings") },
  ];

  return (
    <div
      role="tablist"
      aria-label="Account navigation"
      style={{
        display: "flex",
        gap: 4,
        marginBottom: 32,
        borderBottom: `1px solid ${B}`,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.id === current;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={active}
            style={{
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: active ? T : TS,
              borderBottom: active ? `2px solid ${T}` : "2px solid transparent",
              marginBottom: -1,
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = T; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = TS; }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
