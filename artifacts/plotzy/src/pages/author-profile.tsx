import { useState, useRef, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { JsonLd } from "@/components/JsonLd";
import { buildPersonSchema } from "@/lib/seo-schema";
import {
  BookOpen, Users, UserPlus, UserCheck, Globe, Twitter, Instagram,
  Edit3, Check, X, Calendar, ArrowLeft, MessageCircle, Heart, Eye,
  Camera, Loader2, Star, Share2, PlusCircle, ChevronDown,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

/* ── Design tokens (monochromatic black/white) ─────────────────────── */
const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const BG = "#000";
const C1 = "#0a0a0a";
const C2 = "#111";
const C3 = "#1a1a1a";
const B = "rgba(255,255,255,0.08)";
const T = "#fff";
const TS = "rgba(255,255,255,0.55)";
const TD = "rgba(255,255,255,0.25)";

/* ── Types ─────────────────────────────────────────────────────────── */
interface AuthorBook {
  id: number;
  title: string;
  coverImage: string | null;
  summary: string | null;
  authorName: string | null;
  isPublished: boolean;
  createdAt: string;
  viewCount?: number;
  likesCount?: number;
}

interface AuthorProfileData {
  id: number;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  website: string | null;
  twitterHandle: string | null;
  instagramHandle: string | null;
  createdAt: string;
  books: AuthorBook[];
  followersCount: number;
  followingCount: number;
  totalLikes: number;
  isFollowing: boolean;
}

/* ── Deterministic gradient per display name — gives every author a
   distinct but consistent avatar placeholder so empty circles don't all
   look identical. ─────────────────────────────────────────────────── */
function avatarGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const hue1 = Math.abs(h) % 360;
  const hue2 = (hue1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 55%, 40%) 0%, hsl(${hue2}, 55%, 25%) 100%)`;
}

/* ── Field character limits ────────────────────────────────────────── */
const MAX_DISPLAY_NAME = 50;
const MAX_BIO = 200;

/* ── URL safety: only render links for http(s) schemes. A stored value
   of `javascript:…` or a missing scheme would otherwise become a live
   click target — cheap way for someone's author website to become an
   XSS vector or a phishing redirect. Returns null for unsafe values so
   the caller can decide whether to hide the link or show plain text. */
function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    // URL constructor rejects malformed inputs and resolves relative
    // forms against the current origin — we explicitly allow only
    // http/https absolute URLs.
    const u = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/* ── Book sort options ────────────────────────────────────────────── */
type BookSort = "newest" | "liked" | "viewed";

/* ── Edit Profile Modal ────────────────────────────────────────────── */
function EditProfileModal({
  profile,
  onClose,
  userId,
  ar,
}: {
  profile: AuthorProfileData;
  onClose: () => void;
  userId: number;
  ar: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [form, setForm] = useState({
    displayName: profile.displayName || "",
    bio: profile.bio || "",
    website: profile.website || "",
    twitterHandle: profile.twitterHandle || "",
    instagramHandle: profile.instagramHandle || "",
  });

  const saveMutation = useMutation({
    // Surface the actual server error message (Zod validation returns a
    // human-readable reason) instead of the old "Save failed" dead-end
    // that left the user guessing why their Instagram URL paste didn't
    // stick.
    mutationFn: async () => {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || `Save failed (${res.status})`);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/authors", userId, "profile"] });
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: ar ? "تم الحفظ!" : "Profile updated!" });
      onClose();
    },
    onError: (err: Error) =>
      toast({
        title: ar ? "فشل الحفظ" : "Save failed",
        description: err.message,
        variant: "destructive",
      }),
  });

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const res = await fetch("/api/auth/avatar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ avatarUrl: dataUrl }),
        });
        if (res.ok) {
          qc.invalidateQueries({ queryKey: ["/api/authors", userId, "profile"] });
          qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
          toast({ title: "Profile photo updated!" });
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const handleBannerUpload = async (file: File) => {
    setBannerUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const res = await fetch("/api/me/profile", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          credentials: "include", body: JSON.stringify({ bannerUrl: dataUrl }),
        });
        if (res.ok) {
          qc.invalidateQueries({ queryKey: ["/api/authors", userId, "profile"] });
          toast({ title: "Cover photo updated!" });
        }
        setBannerUploading(false);
      };
      reader.readAsDataURL(file);
    } catch { setBannerUploading(false); toast({ title: "Upload failed", variant: "destructive" }); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    background: C3, border: `1px solid ${B}`, color: T,
    fontFamily: SF, fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: SF, fontSize: 11, fontWeight: 600,
    color: TD, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6,
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: C2, border: `1px solid ${B}`, borderRadius: 20, width: "100%", maxWidth: 780, maxHeight: "90vh", overflowY: "auto", padding: 28 }} dir={ar ? "rtl" : "ltr"}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <span style={{ fontFamily: SF, fontSize: 18, fontWeight: 700, color: T }}>{ar ? "تعديل الملف" : "Edit Profile"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: TD }}><X size={18} /></button>
        </div>

        {/* Two-column layout: media uploads on one side, text fields on the
            other. Stacks to a single column on narrow viewports so mobile
            users never get a cramped side-by-side. */}
        <div className="edit-profile-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 260px) 1fr", gap: 24 }}>

          {/* ── Media column ──────────────────────────────────── */}
          <div>
            {/* Avatar upload */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: TD, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                {ar ? "الصورة الشخصية" : "Profile Photo"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ position: "relative", width: 72, height: 72, borderRadius: "50%", background: C3, border: `2px solid ${B}`, overflow: "hidden", flexShrink: 0 }}>
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.displayName || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SF, fontSize: 24, fontWeight: 700, color: TS }}>
                      {(profile.displayName || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "0"; }}
                  >
                    {uploading ? <Loader2 size={18} color="#fff" style={{ animation: "spin 1s linear infinite" }} /> : <Camera size={18} color="#fff" />}
                  </button>
                </div>
                <div style={{ fontFamily: SF, fontSize: 11, color: TD, lineHeight: 1.5 }}>
                  {ar ? "اضغط على الصورة لرفع صورة" : "Click avatar to upload"}
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
              </div>
            </div>

            {/* Banner upload — slimmer now that it shares space with the
                text column; full preview of the chosen image still shows. */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: TD, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                {ar ? "صورة الغلاف" : "Cover Photo"}
              </div>
              <div
                onClick={() => bannerInputRef.current?.click()}
                style={{
                  position: "relative", width: "100%", aspectRatio: "16/6", borderRadius: 10, overflow: "hidden",
                  background: profile.bannerUrl ? `url(${profile.bannerUrl}) center/cover` : `linear-gradient(135deg, ${C3} 0%, #1a1a2e 100%)`,
                  border: `1px solid ${B}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <div style={{ background: "rgba(0,0,0,0.65)", borderRadius: 8, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6, color: "#fff", fontSize: 11, fontWeight: 600 }}>
                  {bannerUploading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Camera size={12} />}
                  {profile.bannerUrl
                    ? (ar ? "تغيير الغلاف" : "Change Cover")
                    : (ar ? "إضافة غلاف" : "Add Cover")}
                </div>
              </div>
              <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleBannerUpload(f); e.target.value = ""; }} />
            </div>
          </div>

          {/* ── Text fields column ────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label style={labelStyle}>{ar ? "اسم العرض" : "Display Name"}</label>
              <span style={{ fontSize: 10, color: form.displayName.length > MAX_DISPLAY_NAME * 0.9 ? "#f59e0b" : TD }}>
                {form.displayName.length}/{MAX_DISPLAY_NAME}
              </span>
            </div>
            <input
              value={form.displayName}
              onChange={e => setForm(p => ({ ...p, displayName: e.target.value.slice(0, MAX_DISPLAY_NAME) }))}
              maxLength={MAX_DISPLAY_NAME}
              style={inputStyle}
              placeholder={ar ? "اسمك" : "Your name"}
            />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label style={labelStyle}>{ar ? "نبذة" : "Bio"}</label>
              <span style={{ fontSize: 10, color: form.bio.length > MAX_BIO * 0.9 ? "#f59e0b" : TD }}>
                {form.bio.length}/{MAX_BIO}
              </span>
            </div>
            <textarea
              value={form.bio}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value.slice(0, MAX_BIO) }))}
              maxLength={MAX_BIO}
              rows={3}
              placeholder={ar ? "عرّف القراء على نفسك..." : "Tell readers about yourself..."}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>
          <div>
            <label style={labelStyle}>{ar ? "الموقع الإلكتروني" : "Website"}</label>
            <input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} style={inputStyle} placeholder="https://yoursite.com" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Twitter / X</label>
              <input
                value={form.twitterHandle}
                onChange={e => setForm(p => ({ ...p, twitterHandle: e.target.value }))}
                maxLength={200}
                style={inputStyle}
                placeholder={ar ? "@handle أو رابط الملف" : "@handle or profile URL"}
              />
            </div>
            <div>
              <label style={labelStyle}>Instagram</label>
              <input
                value={form.instagramHandle}
                onChange={e => setForm(p => ({ ...p, instagramHandle: e.target.value }))}
                maxLength={200}
                style={inputStyle}
                placeholder={ar ? "@handle أو رابط الملف" : "@handle or profile URL"}
              />
            </div>
          </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 10, background: "transparent", border: `1px solid ${B}`, fontFamily: SF, fontSize: 13, fontWeight: 500, color: TS, cursor: "pointer" }}>
            {ar ? "إلغاء" : "Cancel"}
          </button>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            style={{ padding: "9px 24px", borderRadius: 10, background: "#fff", border: "none", fontFamily: SF, fontSize: 13, fontWeight: 600, color: "#000", cursor: "pointer", opacity: saveMutation.isPending ? 0.5 : 1 }}>
            {saveMutation.isPending
              ? (ar ? "جارٍ الحفظ..." : "Saving...")
              : (ar ? "حفظ التغييرات" : "Save Changes")}
          </button>
        </div>

        {/* Collapse the two-column grid on narrow viewports so mobile
            users don't see a cramped side-by-side. */}
        <style>{`
          @media (max-width: 640px) {
            .edit-profile-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

/* ── Profile skeleton — shown while the author data is loading.
   Shape-matches the real layout so the transition to loaded state
   doesn't cause a visible jump. ────────────────────────────────── */
function ProfileSkeleton() {
  const shimmer: React.CSSProperties = {
    background: "linear-gradient(90deg, #151515 0%, #202020 50%, #151515 100%)",
    backgroundSize: "200% 100%",
    animation: "profileShimmer 1.4s infinite",
  };
  return (
    <div style={{ background: BG, minHeight: "100vh" }}>
      <div style={{ ...shimmer, width: "100%", height: 140 }} />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 36px", marginTop: -40 }}>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          <div style={{ ...shimmer, width: 100, height: 100, borderRadius: "50%", border: `4px solid ${BG}`, flexShrink: 0 }} />
          <div style={{ flex: 1, paddingTop: 48 }}>
            <div style={{ ...shimmer, width: "40%", height: 22, borderRadius: 6, marginBottom: 10 }} />
            <div style={{ ...shimmer, width: "80%", height: 12, borderRadius: 4, marginBottom: 6 }} />
            <div style={{ ...shimmer, width: "60%", height: 12, borderRadius: 4, marginBottom: 18 }} />
            <div style={{ display: "flex", gap: 24 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ ...shimmer, width: 50, height: 28, borderRadius: 6 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px" }}>
        <div style={{ ...shimmer, width: 160, height: 18, borderRadius: 5, marginBottom: 24 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 20 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i}>
              <div style={{ ...shimmer, aspectRatio: "2/3", borderRadius: 12, marginBottom: 10 }} />
              <div style={{ ...shimmer, width: "85%", height: 12, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes profileShimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
    </div>
  );
}

/* ── Stat Pill ─────────────────────────────────────────────────────── */
function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 70 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon}
        <span style={{ fontFamily: SF, fontSize: 20, fontWeight: 700, color: T }}>{typeof value === "number" ? value.toLocaleString() : value}</span>
      </div>
      <span style={{ fontFamily: SF, fontSize: 10, fontWeight: 500, color: TD, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────── */
export default function AuthorProfile() {
  const [, params] = useRoute("/authors/:userId");
  const userId = Number(params?.userId);
  const { user } = useAuth();
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [, navigate] = useLocation();
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bookSort, setBookSort] = useState<BookSort>("newest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortBtnRef = useRef<HTMLButtonElement>(null);

  const handleShareProfile = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    // Prefer the native share sheet on mobile (single-tap share to any
    // app); fall back to clipboard copy on desktop with a toast so the
    // user knows something happened.
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: (profile?.displayName || (ar ? "كاتب على Plotzy" : "Plotzy author")) + " · Plotzy",
          url,
        });
        return;
      } catch {
        // User cancelled share sheet — fall through to clipboard copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: ar ? "تم نسخ الرابط" : "Link copied to clipboard" });
    } catch {
      toast({
        title: ar ? "فشل نسخ الرابط" : "Couldn't copy link",
        variant: "destructive",
      });
    }
  };

  const { data: profile, isLoading } = useQuery<AuthorProfileData>({
    queryKey: ["/api/authors", userId, "profile"],
    queryFn: () => fetch(`/api/authors/${userId}/profile`, { credentials: "include" }).then(r => r.json()),
    enabled: !!userId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const method = profile?.isFollowing ? "DELETE" : "POST";
      const res = await fetch(`/api/authors/${userId}/follow`, { method, credentials: "include" });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/authors", userId, "profile"] }),
    onError: () => toast({ title: "Please log in to follow authors", variant: "destructive" }),
  });

  const isOwnProfile = user && Number((user as any).id) === userId;

  const handleAvatarUpload = (file: File) => {
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const dataUrl = ev.target?.result as string;
        const res = await fetch("/api/auth/avatar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ avatarUrl: dataUrl }),
        });
        if (res.ok) {
          qc.invalidateQueries({ queryKey: ["/api/authors", userId, "profile"] });
          qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
          toast({ title: "Profile photo updated!" });
        }
      } catch { toast({ title: "Upload failed", variant: "destructive" }); }
      finally { setAvatarUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const totalLikes = profile?.totalLikes ?? 0;

  // Memoise the avatar gradient so it doesn't recompute every render.
  const avatarBg = useMemo(
    () => avatarGradient(profile?.displayName || String(userId)),
    [profile?.displayName, userId],
  );

  /* ── Loading ── */
  if (isLoading) return (
    <Layout isLanding darkNav>
      <ProfileSkeleton />
    </Layout>
  );

  if (!profile || (profile as any).message) return (
    <Layout isLanding darkNav>
      <SEO title={ar ? "الكاتب غير موجود" : "Author not found"} noindex />
      <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ fontFamily: SF, color: TS, fontSize: 16 }}>{ar ? "الكاتب غير موجود" : "Author not found"}</p>
        <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", borderRadius: 10, background: C3, border: `1px solid ${B}`, fontFamily: SF, fontSize: 13, color: TS, cursor: "pointer" }}>
          <ArrowLeft size={14} /> {ar ? "رجوع" : "Go Back"}
        </button>
      </div>
    </Layout>
  );

  return (
    <Layout isLanding darkNav>
      <SEO
        title={profile.displayName || "Author"}
        description={profile.bio || `${profile.displayName || "An author"} on Plotzy — read their books and follow.`}
        ogType="profile"
        ogImage={profile.avatarUrl || undefined}
      />
      <JsonLd data={buildPersonSchema(profile)} />
      <div style={{ background: BG, minHeight: "100vh", fontFamily: SF }}>

        {editOpen && isOwnProfile && <EditProfileModal profile={profile} onClose={() => setEditOpen(false)} userId={userId} ar={ar} />}

        {/* ── Banner ── */}
        <div className="author-banner" style={{ position: "relative", width: "100%", height: profile.bannerUrl ? 220 : 140, overflow: "hidden" }}>
          {profile.bannerUrl ? (
            <img src={profile.bannerUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #0a0a0a 0%, #111 50%, #1a1a2e 100%)" }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)" }} />
          {/* Back button on banner */}
          <button onClick={() => navigate("/")}
            style={{ position: "absolute", top: 16, left: 16, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontFamily: SF, fontSize: 12, color: "#fff", padding: "6px 14px", borderRadius: 8, fontWeight: 500 }}>
            <ArrowLeft size={13} /> {ar ? "الرئيسية" : "Home"}
          </button>
          {/* Banner action cluster — all primary profile actions live up
              here so they can never be pushed off-screen by a very long
              display name or a narrow viewport. Share shown for every
              viewer; Edit Profile and Change Cover only for the owner. */}
          <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "calc(100% - 32px)" }}>
            <button
              onClick={handleShareProfile}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: SF, fontSize: 12, color: "#fff", padding: "7px 14px", borderRadius: 8, fontWeight: 600 }}
              title={ar ? "مشاركة الملف" : "Share profile"}
            >
              <Share2 size={13} /> {ar ? "مشاركة" : "Share"}
            </button>
            {isOwnProfile && (
              <>
                <button onClick={() => setEditOpen(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "none", cursor: "pointer", fontFamily: SF, fontSize: 12, color: "#000", padding: "7px 14px", borderRadius: 8, fontWeight: 700 }}>
                  <Edit3 size={13} /> {ar ? "تعديل الملف" : "Edit Profile"}
                </button>
                <button onClick={() => setEditOpen(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: SF, fontSize: 12, color: "#fff", padding: "7px 14px", borderRadius: 8, fontWeight: 600 }}>
                  <Camera size={13} /> {profile.bannerUrl
                    ? (ar ? "تغيير الغلاف" : "Change Cover")
                    : (ar ? "إضافة غلاف" : "Add Cover")}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Hero Section ── */}
        <div style={{ borderBottom: `1px solid ${B}`, background: C1 }}>
          <div className="author-hero-wrap" style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 36px", marginTop: -40 }}>

            {/* Profile row */}
            <div className="author-profile-row" style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

              {/* Avatar — overlapping banner. Placeholder uses a
                  deterministic gradient derived from the display name
                  so every author's circle looks distinct and the
                  initial is readable (white, bold) instead of a
                  low-contrast arc on near-black. */}
              <div
                className="author-avatar"
                style={{
                  position: "relative", width: 100, height: 100, borderRadius: "50%", flexShrink: 0,
                  background: profile.avatarUrl ? C3 : avatarBg,
                  border: `4px solid ${BG}`,
                  overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: isOwnProfile ? "pointer" : "default",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
                }}
                onClick={() => { if (isOwnProfile) avatarFileRef.current?.click(); }}
              >
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.displayName || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 42, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", textShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
                    {(profile.displayName || "?").trim().charAt(0).toUpperCase() || "?"}
                  </span>
                )}
                {/* Camera overlay for own profile */}
                {isOwnProfile && (
                  <div
                    className="avatar-upload-overlay"
                    style={{
                      position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                      opacity: 0, transition: "opacity 0.15s",
                    }}
                  >
                    {avatarUploading
                      ? <Loader2 size={20} color="#fff" style={{ animation: "spin 1s linear infinite" }} />
                      : <><Camera size={20} color="#fff" /><span style={{ fontFamily: SF, fontSize: 9, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{ar ? "رفع" : "UPLOAD"}</span></>
                    }
                  </div>
                )}
                <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ""; }} />
              </div>

              {/* Name + Bio + Actions */}
              <div style={{ flex: 1, minWidth: 0 }}>

                {/* Name row — the action buttons now live up in the
                    banner so this row is purely identity, no risk of a
                    very long display name pushing controls off-screen. */}
                <div style={{ marginBottom: 6 }}>
                  <h1 style={{
                    fontSize: 24, fontWeight: 700, color: T, margin: 0, letterSpacing: "-0.02em",
                    overflow: "hidden", textOverflow: "ellipsis",
                    // Cap to 3 lines for extreme inputs, still readable.
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical" as any,
                    wordBreak: "break-word",
                  }}>
                    {profile.displayName || (ar ? "كاتب" : "Author")}
                  </h1>
                </div>

                {/* Bio — dashed box for the owner-empty case so it reads
                    as an invitation, not an afterthought. */}
                {profile.bio ? (
                  <p style={{ fontSize: 14, color: TS, lineHeight: 1.7, margin: "0 0 12px", maxWidth: 520 }}>{profile.bio}</p>
                ) : isOwnProfile ? (
                  <div
                    onClick={() => setEditOpen(true)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      fontSize: 13, color: TS, lineHeight: 1.6, margin: "0 0 14px",
                      cursor: "pointer", fontStyle: "italic",
                      padding: "8px 14px", borderRadius: 10,
                      background: "rgba(255,255,255,0.04)",
                      border: `1px dashed ${B}`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = B; }}
                  >
                    <Edit3 size={13} />
                    {ar ? "اضغط لإضافة نبذة تعرّف القراء على نفسك" : "Add a bio to tell readers about yourself"}
                  </div>
                ) : null}

                {/* Social links */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 16 }}>
                  {/* Validate the stored website URL before making it clickable
                      — a pasted `javascript:…` would otherwise become a live
                      XSS vector, and a missing scheme would produce a relative
                      link to our own domain. */}
                  {profile.website && (() => {
                    const safe = safeExternalUrl(profile.website);
                    if (!safe) return null;
                    const display = safe.replace(/^https?:\/\//, "").replace(/\/$/, "");
                    return (
                      <a href={safe} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: TS, textDecoration: "none" }}
                        onMouseEnter={e => { e.currentTarget.style.color = T; }} onMouseLeave={e => { e.currentTarget.style.color = TS; }}>
                        <Globe size={12} /> {display}
                      </a>
                    );
                  })()}
                  {profile.twitterHandle && (
                    <a href={`https://twitter.com/${profile.twitterHandle.replace("@", "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: TS, textDecoration: "none" }}
                      onMouseEnter={e => { e.currentTarget.style.color = T; }} onMouseLeave={e => { e.currentTarget.style.color = TS; }}>
                      <Twitter size={12} /> {profile.twitterHandle.startsWith("@") ? profile.twitterHandle : `@${profile.twitterHandle}`}
                    </a>
                  )}
                  {profile.instagramHandle && (
                    <a href={`https://instagram.com/${profile.instagramHandle.replace("@", "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: TS, textDecoration: "none" }}
                      onMouseEnter={e => { e.currentTarget.style.color = T; }} onMouseLeave={e => { e.currentTarget.style.color = TS; }}>
                      <Instagram size={12} /> {profile.instagramHandle.startsWith("@") ? profile.instagramHandle : `@${profile.instagramHandle}`}
                    </a>
                  )}
                  {profile.createdAt && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: TD }}>
                      <Calendar size={12} /> {ar ? "انضم" : "Joined"} {new Date(profile.createdAt).toLocaleDateString(ar ? "ar-EG" : "en-US", { year: "numeric", month: "short" })}
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                  <StatPill icon={<Users size={14} color={TS} />} value={profile.followersCount} label={ar ? "متابعون" : "Followers"} />
                  <StatPill icon={<UserPlus size={14} color={TS} />} value={profile.followingCount} label={ar ? "يتابع" : "Following"} />
                  <StatPill icon={<BookOpen size={14} color={TS} />} value={profile.books.length} label={ar ? "كتب" : "Books"} />
                  <StatPill icon={<Heart size={14} color={TS} />} value={totalLikes} label={ar ? "إعجابات" : "Likes"} />

                  {/* Action buttons */}
                  {!isOwnProfile && (
                    <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                      <button
                        onClick={() => followMutation.mutate()}
                        disabled={followMutation.isPending}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "8px 18px", borderRadius: 20, cursor: "pointer",
                          fontFamily: SF, fontSize: 13, fontWeight: 600,
                          background: profile.isFollowing ? "transparent" : "#fff",
                          color: profile.isFollowing ? TS : "#000",
                          border: profile.isFollowing ? `1px solid ${B}` : "none",
                          transition: "all 0.15s",
                        }}
                      >
                        {profile.isFollowing
                          ? <><UserCheck size={13} /> {ar ? "تتابعه" : "Following"}</>
                          : <><UserPlus size={13} /> {ar ? "متابعة" : "Follow"}</>}
                      </button>
                      {user && (
                        <button
                          onClick={() => navigate(`/messages/${userId}`)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 18px", borderRadius: 20, cursor: "pointer",
                            fontFamily: SF, fontSize: 13, fontWeight: 500,
                            background: "transparent", color: TS,
                            border: `1px solid ${B}`, transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = T; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = B; e.currentTarget.style.color = TS; }}
                        >
                          <MessageCircle size={13} /> {ar ? "رسالة" : "Message"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Books Grid ── */}
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <BookOpen size={15} color={TS} />
            <span style={{ fontSize: 15, fontWeight: 700, color: T }}>{ar ? "الأعمال المنشورة" : "Published Works"}</span>
            <span style={{ fontSize: 12, color: TD, marginLeft: 4 }}>({profile.books.length})</span>

            {/* Sort dropdown — only renders when there are enough books to
                make ordering meaningful. Below that threshold the control
                is just noise. */}
            {profile.books.length > 1 && (
              <div style={{ marginLeft: "auto", position: "relative" }}>
                <button
                  ref={sortBtnRef}
                  onClick={() => setSortMenuOpen(v => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 20, cursor: "pointer",
                    background: "transparent", border: `1px solid ${B}`,
                    fontFamily: SF, fontSize: 11, fontWeight: 500, color: TS,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = B; }}
                >
                  {bookSort === "newest" ? (ar ? "الأحدث" : "Newest")
                    : bookSort === "liked" ? (ar ? "الأكثر إعجاباً" : "Most Liked")
                    : (ar ? "الأكثر مشاهدة" : "Most Viewed")}
                  <ChevronDown size={11} />
                </button>
                {sortMenuOpen && (
                  <>
                    <div onClick={() => setSortMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                    <div style={{
                      position: "absolute", top: "100%", right: 0, marginTop: 6, zIndex: 41,
                      background: C2, border: `1px solid ${B}`, borderRadius: 10,
                      minWidth: 180, padding: 4, boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                    }}>
                      {([
                        ["newest", ar ? "الأحدث" : "Newest"],
                        ["liked", ar ? "الأكثر إعجاباً" : "Most Liked"],
                        ["viewed", ar ? "الأكثر مشاهدة" : "Most Viewed"],
                      ] as const).map(([key, label]) => (
                        <button key={key}
                          onClick={() => { setBookSort(key); setSortMenuOpen(false); }}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            width: "100%", padding: "8px 12px", borderRadius: 6,
                            background: bookSort === key ? "rgba(255,255,255,0.06)" : "transparent",
                            border: "none", cursor: "pointer", fontFamily: SF, fontSize: 12,
                            color: bookSort === key ? T : TS, textAlign: ar ? "right" : "left",
                          }}
                        >
                          <span>{label}</span>
                          {bookSort === key && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {profile.books.length === 0 ? (
            // Empty state — different voice for own profile (call to
            // action) vs visitor (read-only explanation). A first-time
            // author seeing "No published books yet" with no next step
            // is a dead end; show them the path forward instead.
            <div style={{ textAlign: "center", padding: "60px 20px", color: TD, border: `1.5px dashed ${B}`, borderRadius: 16 }}>
              <BookOpen size={34} style={{ margin: "0 auto 14px", opacity: 0.35 }} />
              {isOwnProfile ? (
                <>
                  <p style={{ fontSize: 15, fontWeight: 600, color: TS, margin: 0, marginBottom: 6 }}>
                    {ar ? "قصتك الأولى تبدأ من هنا" : "Your first story starts here"}
                  </p>
                  <p style={{ fontSize: 12, margin: "0 0 18px", maxWidth: 360, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
                    {ar
                      ? "ابدأ كتاباً جديداً وعند النشر سيظهر هنا ليراه القرّاء والمتابعون."
                      : "Start a new book — once you publish it, it will appear here for readers and followers."}
                  </p>
                  <button
                    onClick={() => navigate("/")}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 7,
                      padding: "9px 20px", borderRadius: 20, cursor: "pointer",
                      background: "#fff", color: "#000", border: "none",
                      fontFamily: SF, fontSize: 13, fontWeight: 600,
                    }}
                  >
                    <PlusCircle size={14} /> {ar ? "ابدأ كتاباً" : "Start a book"}
                  </button>
                </>
              ) : (
                <p style={{ fontSize: 14, margin: 0 }}>
                  {ar ? "لم ينشر هذا الكاتب أي أعمال بعد" : "This author hasn't published anything yet"}
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 20 }}>
              {[...profile.books].sort((a, b) => {
                if (bookSort === "liked") return (b.likesCount ?? 0) - (a.likesCount ?? 0);
                if (bookSort === "viewed") return (b.viewCount ?? 0) - (a.viewCount ?? 0);
                // Default newest-first by createdAt.
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              }).map(book => (
                <Link key={book.id} href={`/read/${book.id}`}>
                  <div style={{ cursor: "pointer", transition: "transform 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {/* Cover */}
                    <div style={{
                      aspectRatio: "2/3", borderRadius: 12, overflow: "hidden",
                      background: C3, border: `1px solid ${B}`, marginBottom: 10,
                    }}>
                      {book.coverImage ? (
                        <img src={book.coverImage} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: TS, textAlign: "center", lineHeight: 1.5 }}>{book.title}</p>
                        </div>
                      )}
                    </div>
                    {/* Title */}
                    <p style={{ fontSize: 13, fontWeight: 600, color: T, lineHeight: 1.4, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{book.title}</p>
                    {/* Stats */}
                    <div style={{ display: "flex", gap: 10, fontSize: 11, color: TD }}>
                      {(book.likesCount ?? 0) > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Heart size={10} /> {book.likesCount}</span>}
                      {(book.viewCount ?? 0) > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Eye size={10} /> {book.viewCount}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <style>{`
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          div:hover > .avatar-upload-overlay { opacity: 1 !important; }
        `}</style>
      </div>
    </Layout>
  );
}
