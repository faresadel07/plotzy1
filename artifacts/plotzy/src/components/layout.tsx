import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, LogOut, User, Camera, GraduationCap, Zap, Store, Library, Globe, Settings2, Menu, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import { NotificationBell } from "@/components/notification-bell";
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
  { href: "/dashboard",     key: "myLibrary" },
  { href: "/tutorial",      key: "navTutorial" },
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

const FOOTER_LINK_STYLE: React.CSSProperties = { fontSize: 13.5, color: 'rgba(255,255,255,0.48)', textDecoration: 'none', transition: 'color 0.15s', fontFamily: SF_FONT, lineHeight: 1.4, cursor: 'pointer' };

/* ── Social media SVG icons (inline, no external deps) ────────── */
const SocialSvg = {
  instagram: (p: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  linkedin: (p: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>,
  youtube: (p: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.43z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>,
  twitter: (p: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  tiktok: (p: any) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.89a8.23 8.23 0 004.77 1.52V7a4.85 4.85 0 01-1-.31z"/></svg>,
};

function FooterSocialIcons() {
  const { data: links } = useQuery<Record<string, string>>({
    queryKey: ["/api/social-links"],
    queryFn: () => fetch("/api/social-links").then(r => r.ok ? r.json() : {}),
    staleTime: 5 * 60 * 1000,
  });
  if (!links || Object.keys(links).length === 0) return null;
  const entries = Object.entries(links).filter(([, url]) => !!url);
  if (entries.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
      {entries.map(([key, url]) => {
        const Icon = SocialSvg[key as keyof typeof SocialSvg];
        if (!Icon) return null;
        return (
          <a key={key} href={url} target="_blank" rel="noopener noreferrer"
            style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", transition: "all 0.2s", textDecoration: "none" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <Icon style={{ width: 16, height: 16 }} />
          </a>
        );
      })}
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', margin: '0 0 6px', fontFamily: SF_FONT }}>
        {title}
      </p>
      {links.map(({ label, href }) =>
        href.startsWith('/') ? (
          <Link key={label} href={href} style={FOOTER_LINK_STYLE}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = 'rgba(255,255,255,0.88)')}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = 'rgba(255,255,255,0.48)')}
          >{label}</Link>
        ) : (
          <a key={label} href={href} style={FOOTER_LINK_STYLE}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.88)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.48)')}
          >{label}</a>
        )
      )}
    </div>
  );
}

export function Layout({ children, isLanding, isFullDark, lightNav, noScroll, darkNav }: { children: React.ReactNode; isLanding?: boolean; isFullDark?: boolean; lightNav?: boolean; noScroll?: boolean; darkNav?: boolean }) {
  const [location, navigate] = useLocation();
  const { t, isRTL } = useLanguage();
  const { user, isLoading, logout, refetch: refetchAuth } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showDisplayName, setShowDisplayName] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);
  const [banner, setBannerData] = useState<{ message: string | null; color: string | null } | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Listen for "open-auth-modal" events from other pages
  useEffect(() => {
    const handler = () => setAuthModalOpen(true);
    window.addEventListener("open-auth-modal", handler);
    return () => window.removeEventListener("open-auth-modal", handler);
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/admin/support/unread-count", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUnreadSupportCount(data.count ?? 0);
        }
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user?.isAdmin]);

  useEffect(() => {
    fetch("/api/banner").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.message) setBannerData(data);
    }).catch(() => {});
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const canvas = document.createElement("canvas");
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = url;
      });
      const size = 256;
      const ratio = Math.min(size / img.width, size / img.height);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      const res = await fetch("/api/auth/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      if (res.ok) {
        refetchAuth();
      } else if (res.status === 401) {
        setAuthModalOpen(true);
      }
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

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
    <div dir={isRTL ? "rtl" : "ltr"} className={`${noScroll ? "h-screen overflow-hidden" : "min-h-screen"} flex flex-col${isFullDark ? " dark bg-background text-foreground" : " bg-background text-foreground"}`}
      style={darkNav ? { background: "#080808" } : undefined}>

      {/* ── Top navbar ── */}
      <header style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 100,
        height: 44,
        background: darkNav
          ? (scrolled ? "rgba(8,8,8,0.96)" : "rgba(8,8,8,0.88)")
          : (scrolled ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.97)"),
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderBottom: darkNav
          ? `1px solid ${scrolled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)"}`
          : `1px solid ${scrolled ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.06)"}`,
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
              height: 24,
              width: 24,
              objectFit: "contain",
              borderRadius: 5,
              filter: "none",
              flexShrink: 0,
            }}
          />
          <span style={{
            fontFamily: SF,
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "-0.04em",
            color: darkNav ? "#fff" : "#111",
          }}>PLOTZY</span>
        </Link>

        {/* ── Center: Nav links (desktop) ── */}
        <nav className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {NAV_ITEMS.map(({ href, key }) =>
            key === "myLibrary" ? (
              <LibraryNavLink key="library" active={location === "/"} navigate={navigate} label={t(key)} dark={darkNav} />
            ) : (
              <NavLink key={href} href={href} label={t(key)} active={location === href} dark={darkNav} />
            )
          )}
        </nav>

        {/* ── Mobile menu button ── */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(o => !o)}
          style={{
            display: "none",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: darkNav ? "#fff" : "#111",
            justifySelf: "center",
          }}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X style={{ width: 22, height: 22 }} /> : <Menu style={{ width: 22, height: 22 }} />}
        </button>

        {/* ── Right: Controls ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>

          {/* Notifications */}
          {user && <NotificationBell darkNav={!!darkNav} />}

          {/* Language */}
          <LanguagePicker />

          {/* Divider */}
          <div style={{ width: 1, height: 16, background: darkNav ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", margin: "0 2px" }} />

          {/* User */}
          {!isLoading && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none" asChild>
                  <button style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "3px 8px 3px 4px",
                    borderRadius: 20,
                    border: darkNav ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.1)",
                    background: "transparent", cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = darkNav ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <Avatar className="w-[22px] h-[22px]">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback style={{ background: darkNav ? "#333" : "#111", color: "#fff", fontSize: 9, fontWeight: 700 }}>
                        {getInitials(user.displayName, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontFamily: SF, fontSize: 12, fontWeight: 500, color: darkNav ? "rgba(255,255,255,0.8)" : "#333", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.displayName || user.email?.split("@")[0] || "Me"}
                      </span>
                      {user.isAdmin && (
                        <span style={{
                          fontFamily: SF, fontSize: 9, fontWeight: 700,
                          letterSpacing: "0.06em", textTransform: "uppercase",
                          color: darkNav ? "#000" : "#fff",
                          background: darkNav ? "#fff" : "#111",
                          borderRadius: 4, padding: "1px 5px",
                          lineHeight: 1.6, flexShrink: 0,
                        }}>Admin</span>
                      )}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-52 rounded-xl" sideOffset={8}>
                  <DropdownMenuLabel className="font-normal" dir={isRTL ? "rtl" : "ltr"}>
                    <div className="flex flex-col gap-0.5">
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p className="font-semibold text-sm truncate">{user.displayName || t("noNameSet")}</p>
                        {user.isAdmin && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                            textTransform: "uppercase", color: "#fff", background: "#111",
                            borderRadius: 4, padding: "1px 5px", lineHeight: 1.6, flexShrink: 0,
                          }}>Admin</span>
                        )}
                      </div>
                      {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowDisplayName(true)} className="gap-2 cursor-pointer" data-testid="menuitem-edit-display-name">
                    <User className="w-4 h-4" />
                    {t("changeDisplayName")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/authors/${user.id}`)} className="gap-2 cursor-pointer">
                    <User className="w-4 h-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={uploadingAvatar}
                    onSelect={() => {
                      setTimeout(() => avatarInputRef.current?.click(), 150);
                    }}
                    className="gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    {uploadingAvatar ? "Uploading..." : "Change profile picture"}
                  </DropdownMenuItem>
                  {user.isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2 cursor-pointer">
                        <Settings2 className="w-4 h-4" />
                        <span style={{ flex: 1 }}>Admin Panel</span>
                        {unreadSupportCount > 0 && (
                          <span style={{
                            minWidth: 18, height: 18, borderRadius: 9,
                            background: "#ef4444", color: "#fff",
                            fontSize: 10, fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: "0 5px",
                          }}>
                            {unreadSupportCount > 99 ? "99+" : unreadSupportCount}
                          </span>
                        )}
                      </DropdownMenuItem>
                    </>
                  )}
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
                  background: darkNav ? "rgba(255,255,255,0.1)" : "#111",
                  border: darkNav ? "1px solid rgba(255,255,255,0.15)" : "none",
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

      {/* ── Mobile overlay menu ── */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
            background: "#000",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: "absolute",
              top: 10,
              right: 16,
              background: "transparent",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: 8,
            }}
            aria-label="Close menu"
          >
            <X style={{ width: 24, height: 24 }} />
          </button>
          {NAV_ITEMS.map(({ href, key }) =>
            key === "myLibrary" ? (
              <a
                key="library"
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  navigate("/");
                }}
                style={{
                  fontFamily: SF,
                  fontSize: 20,
                  fontWeight: location === "/" ? 700 : 400,
                  color: location === "/" ? "#fff" : "rgba(255,255,255,0.7)",
                  textDecoration: "none",
                  padding: "10px 24px",
                }}
              >
                {t(key)}
              </a>
            ) : (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontFamily: SF,
                  fontSize: 20,
                  fontWeight: location === href ? 700 : 400,
                  color: location === href ? "#fff" : "rgba(255,255,255,0.7)",
                  textDecoration: "none",
                  padding: "10px 24px",
                }}
              >
                {t(key)}
              </Link>
            )
          )}
        </div>
      )}

      {/* ── Site-wide Banner ── */}
      {banner?.message && !bannerDismissed && (() => {
        const BG: Record<string, string> = {
          default: "#1a1a1a", info: "#1e40af", success: "#166534", warning: "#92400e", danger: "#991b1b",
        };
        const FG: Record<string, string> = {
          default: "#fff", info: "#fff", success: "#fff", warning: "#fef08a", danger: "#fff",
        };
        const bg = BG[banner.color ?? "default"] ?? BG.default;
        const fg = FG[banner.color ?? "default"] ?? FG.default;
        return (
          <div style={{
            position: "fixed", top: 44, left: 0, right: 0, zIndex: 90,
            background: bg, color: fg,
            padding: "8px 20px", fontSize: 13, fontWeight: 500,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          }}>
            <span style={{ flex: 1, textAlign: "center" }}>📢 {banner.message}</span>
            <button
              onClick={() => setBannerDismissed(true)}
              style={{ background: "none", border: "none", cursor: "pointer", color: fg, opacity: 0.6, fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}
            >×</button>
          </div>
        );
      })()}

      <main className={
        noScroll ? "flex-1 overflow-hidden pt-[44px]" :
        isLanding ? "flex-1 w-full pt-11" :
        isFullDark ? "flex-1 w-full pt-[60px]" :
        "flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-[72px] pb-10"
      }>
        {children}
      </main>

      {!noScroll && (
      <footer style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #030303 100%)', fontFamily: SF_FONT, position: 'relative', overflow: 'hidden' }}>

        {/* Accent top border */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.12) 70%, transparent 100%)' }} />

        {/* Subtle radial glow */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 700, height: 320, background: 'radial-gradient(ellipse at center top, rgba(255,255,255,0.022) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Main content */}
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '48px 32px 48px', position: 'relative' }}>
          <div className="site-footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '32px 40px', alignItems: 'start' }}>

            {/* Brand */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}>
                <img src={`${import.meta.env.BASE_URL}plotzy-logo.png`} alt="Plotzy" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 7, filter: 'invert(1)' }} />
                <span style={{ fontWeight: 800, fontSize: 14.5, letterSpacing: '-0.05em', color: '#fff' }}>PLOTZY</span>
              </a>
              <p style={{ fontSize: 13, lineHeight: 1.75, color: 'rgba(255,255,255,0.32)', maxWidth: 240, margin: 0 }}>
                The modern platform for writers. Write, publish, and share your stories with the world.
              </p>
              <p style={{ fontSize: 11, fontStyle: 'italic', color: 'rgba(255,255,255,0.15)', margin: 0, paddingTop: 2, borderLeft: '2px solid rgba(255,255,255,0.08)', paddingLeft: 10 }}>
                "Every great story begins with a blank page."
              </p>
              <FooterSocialIcons />
            </div>

            {/* Write */}
            <FooterCol title="Write" links={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'AI Marketplace', href: '/marketplace' },
              { label: 'Cover Designer', href: '/' },
              { label: 'Pricing & Plans', href: '/pricing' },
            ]} />

            {/* Read & Explore */}
            <FooterCol title="Read & Explore" links={[
              { label: 'Community Library', href: '/library' },
              { label: 'Public Domain Books', href: '/discover' },
              { label: 'Messages', href: '/messages' },
            ]} />

            {/* Learn */}
            <FooterCol title="Learn" links={[
              { label: 'Writing Guide', href: '/writing-guide' },
              { label: 'Tutorial Videos', href: '/tutorial' },
              { label: 'Support Center', href: '/support' },
            ]} />

            {/* Legal */}
            <FooterCol title="Legal" links={[
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Terms of Service', href: '/terms' },
            ]} />

          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: 1152, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.2)', margin: 0 }}>
              &copy; {new Date().getFullYear()} Plotzy, Inc. All rights reserved.
            </p>
            <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.15)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              Made with <span style={{ color: '#cc2244', fontSize: 12 }}>♥</span> for writers worldwide
            </p>
          </div>
        </div>
      </footer>
      )}

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleAvatarChange}
      />
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

      {/* ── Responsive styles ── */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .admin-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .site-footer-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn { display: none !important; }
          .mobile-overlay { display: none !important; }
        }
        @media (max-width: 480px) {
          .admin-stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
