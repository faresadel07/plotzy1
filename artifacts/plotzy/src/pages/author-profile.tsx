import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { Layout } from "@/components/layout";
import {
  BookOpen, Users, UserPlus, UserCheck, Globe, Twitter, Instagram,
  Edit3, Check, X, Calendar, Eye, ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuthorBook {
  id: number;
  title: string;
  coverImage: string | null;
  summary: string | null;
  authorName: string | null;
  isPublished: boolean;
  createdAt: string;
}

interface AuthorProfileData {
  id: number;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  website: string | null;
  twitterHandle: string | null;
  instagramHandle: string | null;
  createdAt: string;
  books: AuthorBook[];
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

function EditProfileModal({ profile, onClose }: { profile: AuthorProfileData; onClose: () => void }) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    displayName: profile.displayName || "",
    bio: profile.bio || "",
    website: profile.website || "",
    twitterHandle: profile.twitterHandle || "",
    instagramHandle: profile.instagramHandle || "",
  });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/me/profile", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/authors"] });
      qc.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: ar ? "تم حفظ الملف الشخصي" : "Profile updated!" });
      onClose();
    },
    onError: () => toast({ title: ar ? "فشل الحفظ" : "Save failed", variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{ar ? "تعديل الملف الشخصي" : "Edit Profile"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{ar ? "الاسم" : "Display Name"}</label>
            <Input value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{ar ? "نبذة تعريفية" : "Bio"}</label>
            <Textarea
              value={form.bio}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              rows={3}
              placeholder={ar ? "أخبر القراء عنك..." : "Tell readers about yourself..."}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{ar ? "الموقع الإلكتروني" : "Website"}</label>
            <Input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Twitter / X</label>
              <Input value={form.twitterHandle} onChange={e => setForm(p => ({ ...p, twitterHandle: e.target.value }))} placeholder="@handle" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Instagram</label>
              <Input value={form.instagramHandle} onChange={e => setForm(p => ({ ...p, instagramHandle: e.target.value }))} placeholder="@handle" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>{ar ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ التغييرات" : "Save Changes")}
          </Button>
        </div>
      </div>
    </div>
  );
}

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

  const { data: profile, isLoading } = useQuery<AuthorProfileData>({
    queryKey: ["/api/authors", userId, "profile"],
    queryFn: () => fetch(`/api/authors/${userId}/profile`).then(r => r.json()),
    enabled: !!userId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const method = profile?.isFollowing ? "DELETE" : "POST";
      const res = await fetch(`/api/authors/${userId}/follow`, { method });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/authors", userId, "profile"] });
    },
    onError: () => toast({ title: ar ? "يرجى تسجيل الدخول" : "Please log in to follow authors", variant: "destructive" }),
  });

  const isOwnProfile = user && Number((user as any).id) === userId;

  if (isLoading) {
    return (
      <Layout>
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      </Layout>
    );
  }

  if (!profile || (profile as any).message) {
    return (
      <Layout>
      <div className="flex flex-col items-center justify-center gap-4 text-center p-6">
        <p className="text-muted-foreground text-lg">{ar ? "لم يُعثر على هذا المؤلف" : "Author not found"}</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {ar ? "العودة" : "Go Back"}
        </Button>
      </div>
      </Layout>
    );
  }

  const publishedBooks = profile.books.filter(b => (b as any).publishedAt || (b as any).isPublished !== false);

  return (
    <Layout isLanding>
    <div className="min-h-screen bg-background">
      {editOpen && isOwnProfile && <EditProfileModal profile={profile} onClose={() => setEditOpen(false)} />}

      {/* Header */}
      <div className="border-b border-border/30 bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
            onClick={() => navigate(-1 as any)}
          >
            <ArrowLeft className="w-4 h-4" />
            {ar ? "رجوع" : "Back"}
          </button>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 overflow-hidden shadow-lg">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName || ""} className="w-full h-full object-cover" />
              ) : (
                (profile.displayName || "?")[0].toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start gap-2 mb-2">
                <h1 className="text-2xl font-bold">{profile.displayName || (ar ? "كاتب" : "Author")}</h1>
                {isOwnProfile && (
                  <button
                    onClick={() => setEditOpen(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border/40 rounded-full px-2.5 py-1 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    {ar ? "تعديل الملف" : "Edit Profile"}
                  </button>
                )}
              </div>

              {profile.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-3 max-w-xl">{profile.bio}</p>
              )}

              {/* Social links */}
              <div className="flex flex-wrap gap-3 mb-4">
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <Globe className="w-3.5 h-3.5" />
                    {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {profile.twitterHandle && (
                  <a href={`https://twitter.com/${profile.twitterHandle.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-sky-500 hover:underline">
                    <Twitter className="w-3.5 h-3.5" />
                    {profile.twitterHandle.startsWith("@") ? profile.twitterHandle : `@${profile.twitterHandle}`}
                  </a>
                )}
                {profile.instagramHandle && (
                  <a href={`https://instagram.com/${profile.instagramHandle.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-pink-500 hover:underline">
                    <Instagram className="w-3.5 h-3.5" />
                    {profile.instagramHandle.startsWith("@") ? profile.instagramHandle : `@${profile.instagramHandle}`}
                  </a>
                )}
                {profile.createdAt && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {ar ? "عضو منذ " : "Member since "}
                    {new Date(profile.createdAt).toLocaleDateString(ar ? "ar-SA" : "en-US", { year: "numeric", month: "long" })}
                  </span>
                )}
              </div>

              {/* Stats + Follow button */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold">{profile.followersCount}</div>
                    <div className="text-xs text-muted-foreground">{ar ? "متابع" : "Followers"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{profile.followingCount}</div>
                    <div className="text-xs text-muted-foreground">{ar ? "يتابع" : "Following"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{profile.books.length}</div>
                    <div className="text-xs text-muted-foreground">{ar ? "كتاب" : "Books"}</div>
                  </div>
                </div>

                {!isOwnProfile && (
                  <Button
                    size="sm"
                    variant={profile.isFollowing ? "outline" : "default"}
                    className="rounded-full"
                    onClick={() => followMutation.mutate()}
                    disabled={followMutation.isPending}
                  >
                    {profile.isFollowing ? (
                      <><UserCheck className="w-3.5 h-3.5 mr-1.5" />{ar ? "تتابعه" : "Following"}</>
                    ) : (
                      <><UserPlus className="w-3.5 h-3.5 mr-1.5" />{ar ? "متابعة" : "Follow"}</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Books grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-base font-bold mb-5 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          {ar ? "مؤلفات الكاتب" : "Books by this Author"}
        </h2>

        {profile.books.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{ar ? "لم ينشر هذا الكاتب أي كتاب بعد" : "No published books yet"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {profile.books.map(book => (
              <Link key={book.id} href={`/read/${book.id}`}>
                <div className="group cursor-pointer">
                  <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gradient-to-br from-violet-200 to-purple-300 dark:from-violet-900/40 dark:to-purple-900/40 mb-2 shadow-sm group-hover:shadow-md transition-shadow">
                    {book.coverImage ? (
                      <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-3">
                        <p className="text-xs font-semibold text-center text-violet-700 dark:text-violet-300 line-clamp-4">{book.title}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold line-clamp-2 group-hover:text-primary transition-colors">{book.title}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
}
