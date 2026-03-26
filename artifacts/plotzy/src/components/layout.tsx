import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, LogOut, User, Trash2, GraduationCap, Zap, Store, Library, Globe } from "lucide-react";
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

const NAV_SPAN_STYLE = (active: boolean, dark = false): React.CSSProperties => ({
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 6,
  fontFamily: SF,
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  color: dark ? (active ? "#fff" : "rgba(255,255,255,0.7)") : "#111",
  letterSpacing: "-0.015em",
  cursor: "pointer",
  transition: "color 0.15s, background 0.15s",
  background: active ? (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)") : "transparent",
  userSelect: "none",
  textDecoration: "none",
});

function NavLink({ href, label, active, dark }: { href: string; label: string; active: boolean; dark?: boolean }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <span
        style={NAV_SPAN_STYLE(active, dark)}
        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLSpanElement).style.background = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)"; } }}
        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLSpanElement).style.background = "transparent"; } }}
      >
        {label}
      </span>
    </Link>
  );
}

function LibraryNavLink({ active, navigate, label, dark }: { active: boolean; navigate: (path: string) => void; label?: string; dark?: boolean }) {
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
        style={NAV_SPAN_STYLE(active, dark)}
        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLSpanElement).style.background = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)"; } }}
        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLSpanElement).style.background = "transparent"; } }}
      >
        {label ?? "Library"}
      </span>
    </a>
  );
}

const SF_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif";

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', margin: '0 0 6px', fontFamily: SF_FONT }}>
        {title}
      </p>
      {links.map(({ label, href }) => (
        <a key={label} href={href} style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.48)', textDecoration: 'none', transition: 'color 0.15s', fontFamily: SF_FONT, lineHeight: 1.4 }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.88)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.48)')}
        >{label}</a>
      ))}
    </div>
  );
}

export function Layout({ children, isLanding, isFullDark, lightNav }: { children: React.ReactNode; isLanding?: boolean; isFullDark?: boolean; lightNav?: boolean }) {
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
    <div dir={isRTL ? "rtl" : "ltr"} className={`min-h-screen flex flex-col${isFullDark ? " dark bg-background text-foreground" : " bg-background text-foreground"}`}>

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
          <img
            src={`${import.meta.env.BASE_URL}plotzy-logo.png`}
            alt="Plotzy"
            style={{
              height: 32,
              width: 32,
              objectFit: "contain",
              borderRadius: 6,
              filter: "none",
              flexShrink: 0,
            }}
          />
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
              <LibraryNavLink key="library" active={location === "/"} navigate={navigate} label={t(key)} dark={false} />
            ) : (
              <NavLink key={href} href={href} label={t(key)} active={location === href} dark={false} />
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
                  <DropdownMenuItem onClick={() => navigate("/trash")} className="gap-2 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                    Trash
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

      <footer style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)', fontFamily: SF, position: 'relative', overflow: 'hidden' }}>

        {/* Accent top border */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.12) 70%, transparent 100%)' }} />

        {/* Subtle radial glow in background */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse at center top, rgba(255,255,255,0.025) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Main content */}
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '64px 32px 48px', position: 'relative' }}>

          {/* Top section: brand + quote */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr 1fr', gap: '40px 48px', alignItems: 'start' }}>

            {/* Brand */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}>
                <img src={`${import.meta.env.BASE_URL}plotzy-logo.png`} alt="Plotzy" style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 7, filter: 'invert(1)' }} />
                <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.05em', color: '#fff' }}>PLOTZY</span>
              </a>
              <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.35)', maxWidth: 260, margin: 0 }}>
                The modern platform for writers. Write, publish, and share your stories with the world.
              </p>
              {/* Tagline quote */}
              <p style={{ fontSize: 11.5, fontStyle: 'italic', color: 'rgba(255,255,255,0.18)', margin: 0, paddingTop: 4, borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: 10 }}>
                "Every great story begins with a blank page."
              </p>
            </div>

            {/* Product */}
            <FooterCol title="Product" links={[
              { label: 'Home', href: '/' },
              { label: 'Writing Guide', href: '/writing-guide' },
              { label: 'Marketplace', href: '/marketplace' },
              { label: 'Pricing', href: '/pricing' },
            ]} />

            {/* Community */}
            <FooterCol title="Community" links={[
              { label: 'Community Library', href: '/library' },
              { label: 'Support', href: '/support' },
            ]} />

            {/* Legal */}
            <FooterCol title="Legal" links={[
              { label: 'Privacy Policy', href: '#' },
              { label: 'Terms of Service', href: '#' },
            ]} />

          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: 1152, margin: '0 auto', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', margin: 0 }}>
              &copy; {new Date().getFullYear()} Plotzy. All rights reserved.
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              Made with <span style={{ color: '#e05', fontSize: 13 }}>♥</span> for writers worldwide
            </p>
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
