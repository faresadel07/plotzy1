import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, PenLine, LogOut, User, Trash2, GraduationCap, Zap, Store, Library, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { AuthModal } from "@/components/auth-modal";
import { DisplayNameModal } from "@/components/display-name-modal";
import { LanguagePicker } from "@/components/language-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

const NAV_ITEMS: { href: string; key: string }[] = [
  { href: "/",              key: "myLibrary" },
  { href: "/writing-guide", key: "navGuide" },
  { href: "/marketplace",   key: "navMarketplace" },
  { href: "/library",       key: "navCommunity" },
  { href: "/pricing",       key: "navPro" },
  { href: "/support",       key: "navSupport" },
];

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";

const NAV_SPAN_STYLE = (active: boolean): React.CSSProperties => ({
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 6,
  fontFamily: SF,
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  color: "#111",
  letterSpacing: "-0.015em",
  cursor: "pointer",
  transition: "color 0.15s, background 0.15s",
  background: active ? "rgba(0,0,0,0.06)" : "transparent",
  userSelect: "none",
  textDecoration: "none",
});

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <span
        style={NAV_SPAN_STYLE(active)}
        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLSpanElement).style.background = "rgba(0,0,0,0.04)"; } }}
        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLSpanElement).style.background = "transparent"; } }}
      >
        {label}
      </span>
    </Link>
  );
}

function LibraryNavLink({ active, navigate, label }: { active: boolean; navigate: (path: string) => void; label?: string }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const scrollToWorkspace = () => {
      const el = document.getElementById("workspace");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    if (window.location.pathname === "/") {
      scrollToWorkspace();
    } else {
      navigate("/");
      setTimeout(scrollToWorkspace, 300);
    }
  };
  return (
    <a href="/" onClick={handleClick} style={{ textDecoration: "none" }}>
      <span
        style={NAV_SPAN_STYLE(active)}
        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLSpanElement).style.background = "rgba(0,0,0,0.04)"; } }}
        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLSpanElement).style.background = "transparent"; } }}
      >
        {label ?? "Library"}
      </span>
    </a>
  );
}

export function Layout({ children, isLanding, isFullDark }: { children: React.ReactNode; isLanding?: boolean; isFullDark?: boolean }) {
  const [location, navigate] = useLocation();
  const { t, isRTL } = useLanguage();
  const { user, isLoading, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showDisplayName, setShowDisplayName] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "success" && user && !user.displayName) {
      setShowDisplayName(true);
    }
  }, [user]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className={`min-h-screen flex flex-col${!isFullDark ? " bg-background text-foreground" : ""}`} style={isFullDark ? { background: "#0a0a0a", color: "#fff" } : undefined}>

      {/* ── Apple-style white top navbar ── */}
      <header style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 100,
        height: 44,
        background: scrolled ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.97)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderBottom: `1px solid ${scrolled ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.06)"}`,
        transition: "background 0.3s ease, border-color 0.3s ease",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "0 16px",
      }}>

        {/* ── Left: Logo ── */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: "#111",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <PenLine style={{ width: 13, height: 13, color: "#fff" }} />
          </div>
          <span style={{
            fontFamily: SF,
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "-0.04em",
            color: "#111",
          }}>PLOTZY</span>
        </Link>

        {/* ── Center: Nav links ── */}
        <nav style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {NAV_ITEMS.map(({ href, key }) =>
            key === "myLibrary" ? (
              <LibraryNavLink key="library" active={location === "/"} navigate={navigate} label={t(key)} />
            ) : (
              <NavLink key={href} href={href} label={t(key)} active={location === href} />
            )
          )}
        </nav>

        {/* ── Right: Controls ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>

          {/* Language */}
          <LanguagePicker />

          {/* Divider */}
          <div style={{ width: 1, height: 16, background: "rgba(0,0,0,0.1)", margin: "0 2px" }} />

          {/* User */}
          {!isLoading && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none" asChild>
                  <button style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "3px 8px 3px 4px",
                    borderRadius: 20,
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: "transparent", cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <Avatar className="w-[22px] h-[22px]">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback style={{ background: "#111", color: "#fff", fontSize: 9, fontWeight: 700 }}>
                        {getInitials(user.displayName, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: "#333", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.displayName || user.email?.split("@")[0] || "Me"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-52 rounded-xl" sideOffset={8}>
                  <DropdownMenuLabel className="font-normal" dir={isRTL ? "rtl" : "ltr"}>
                    <div className="flex flex-col gap-0.5">
                      <p className="font-semibold text-sm truncate">{user.displayName || t("noNameSet")}</p>
                      {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowDisplayName(true)} className="gap-2 cursor-pointer" data-testid="menuitem-edit-display-name">
                    <User className="w-4 h-4" />
                    {t("changeDisplayName")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="gap-2 cursor-pointer text-destructive focus:text-destructive" data-testid="menuitem-logout">
                    <LogOut className="w-4 h-4" />
                    {t("signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  background: "#111", border: "none",
                  cursor: "pointer",
                  fontFamily: SF,
                  fontSize: 12.5, fontWeight: 600, color: "#fff",
                  letterSpacing: "-0.02em",
                  transition: "opacity 0.15s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.78")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                {t("signIn")}
              </button>
            )
          )}
        </div>
      </header>

      <main className={isLanding || isFullDark ? "flex-1 w-full pt-11" : "flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-[72px] pb-10"}>
        {children}
      </main>

      <footer style={{ background: '#080808', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="py-8">
          <div className="max-w-6xl mx-auto px-4 text-center space-y-1">
            <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>{t("appName")} &copy; {new Date().getFullYear()}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>{t("tagline")} &mdash; made with <span style={{ color: 'rgba(255,255,255,0.4)' }}>♥</span></p>
          </div>
        </div>
      </footer>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <DisplayNameModal
        open={showDisplayName}
        onDone={() => {
          setShowDisplayName(false);
          if (window.location.search.includes("auth=success")) {
            window.history.replaceState({}, "", window.location.pathname);
          }
        }}
      />
    </div>
  );
}
