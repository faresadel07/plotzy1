import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/language-context";
import { Flame, Target, Calendar, BookOpen, TrendingUp } from "lucide-react";

interface CalendarData {
  days: Record<string, number>;
  currentStreak: number;
  longestStreak: number;
  totalWords: number;
  activeDays: number;
}

function getIntensity(words: number): number {
  if (!words) return 0;
  if (words < 200) return 1;
  if (words < 500) return 2;
  if (words < 1000) return 3;
  return 4;
}

const INTENSITY_COLORS = [
  "bg-muted/30 dark:bg-muted/20",
  "bg-violet-200 dark:bg-violet-900/60",
  "bg-violet-400 dark:bg-violet-700",
  "bg-violet-600 dark:bg-violet-500",
  "bg-violet-800 dark:bg-violet-400",
];

function CalendarGrid({ days }: { days: Record<string, number> }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build last 52 weeks (364 days + today)
  const weeks: { date: string; words: number }[][] = [];
  let week: { date: string; words: number }[] = [];

  // Pad so the grid starts on Sunday
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 363);
  const dayOfWeek = startDate.getDay(); // 0=Sun
  for (let i = 0; i < dayOfWeek; i++) week.push({ date: "", words: 0 });

  for (let i = 0; i < 364; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    week.push({ date: key, words: days[key] || 0 });
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push({ date: "", words: 0 });
    weeks.push(week);
  }

  const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px] min-w-max">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mt-5 mr-1">
          {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
            <div key={i} className="h-[11px] text-[9px] text-muted-foreground/60 leading-none flex items-center">{d}</div>
          ))}
        </div>

        <div className="flex flex-col">
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1 h-4">
            {weeks.map((week, wi) => {
              const firstDayWithDate = week.find(d => d.date);
              if (!firstDayWithDate) return <div key={wi} className="w-[11px]" />;
              const d = new Date(firstDayWithDate.date);
              const isFirstWeekOfMonth = d.getDate() <= 7;
              return (
                <div key={wi} className="w-[11px] text-[9px] text-muted-foreground/60 overflow-visible whitespace-nowrap">
                  {isFirstWeekOfMonth ? MONTH_LABELS[d.getMonth()] : ""}
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => {
                  if (!day.date) return <div key={di} className="w-[11px] h-[11px]" />;
                  const intensity = getIntensity(day.words);
                  const isToday = day.date === today.toISOString().split("T")[0];
                  return (
                    <div
                      key={di}
                      className={`w-[11px] h-[11px] rounded-sm ${INTENSITY_COLORS[intensity]} ${isToday ? "ring-1 ring-primary ring-offset-1 ring-offset-background" : ""} transition-colors`}
                      title={day.words > 0 ? `${day.date}: ${day.words.toLocaleString()} words` : day.date}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
        <span>Less</span>
        {INTENSITY_COLORS.map((c, i) => (
          <div key={i} className={`w-[11px] h-[11px] rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

export function WritingCalendar() {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const { data, isLoading } = useQuery<CalendarData>({
    queryKey: ["/api/me/writing-calendar"],
    queryFn: () => fetch("/api/me/writing-calendar").then(r => r.json()),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-muted/40 rounded w-32" />
        <div className="h-24 bg-muted/20 rounded-xl" />
      </div>
    );
  }

  if (!data || (data as any).message) return null;

  const stats = [
    { icon: Flame, label: ar ? "متتالية الكتابة" : "Current Streak", value: `${data.currentStreak} ${ar ? "يوم" : "days"}`, color: "text-orange-500" },
    { icon: TrendingUp, label: ar ? "أفضل متتالية" : "Longest Streak", value: `${data.longestStreak} ${ar ? "يوم" : "days"}`, color: "text-violet-500" },
    { icon: BookOpen, label: ar ? "إجمالي الكلمات" : "Total Words", value: data.totalWords.toLocaleString(), color: "text-blue-500" },
    { icon: Calendar, label: ar ? "أيام الكتابة" : "Active Days", value: `${data.activeDays}`, color: "text-green-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/20">
            <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{value}</div>
              <div className="text-[10px] text-muted-foreground truncate">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="p-4 rounded-xl bg-muted/10 border border-border/20">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          {ar ? "سجل الكتابة — آخر ٥٢ أسبوعاً" : "Writing Activity — Last 52 Weeks"}
        </p>
        <CalendarGrid days={data.days} />
      </div>
    </div>
  );
}
