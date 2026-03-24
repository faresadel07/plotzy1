import { useQuery } from "@tanstack/react-query";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DailyProgress } from "@/shared/schema";
import { TrendingUp, PenTool, Flame } from "lucide-react";

interface AnalyticsDashboardProps {
    bookId: number;
}

export default function AnalyticsDashboard({ bookId }: AnalyticsDashboardProps) {
    const { data: progress = [], isLoading } = useQuery<DailyProgress[]>({
        queryKey: [`/api/books/${bookId}/progress`],
    });

    if (isLoading) {
        return <div className="h-64 flex items-center justify-center text-muted-foreground animate-pulse">Loading analytics...</div>;
    }

    // Calculate stats
    const totalWords = progress.reduce((sum, record) => sum + record.wordCount, 0);

    // Calculate streak (consecutive days with > 0 words, starting from today or yesterday)
    let streak = 0;
    const sortedDates = [...progress]
        .filter(p => p.wordCount > 0)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sortedDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastEntryDate = new Date(sortedDates[0].date);
        lastEntryDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((today.getTime() - lastEntryDate.getTime()) / (1000 * 3600 * 24));

        if (diffDays <= 1) {
            streak = 1;
            let currentDate = lastEntryDate;

            for (let i = 1; i < sortedDates.length; i++) {
                const nextDate = new Date(sortedDates[i].date);
                nextDate.setHours(0, 0, 0, 0);
                const diff = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 3600 * 24));
                if (diff === 1) {
                    streak++;
                    currentDate = nextDate;
                } else {
                    break;
                }
            }
        }
    }

    // Prepare chart data (last 14 days, filling in gaps with 0)
    const today = new Date();
    const fourteenDaysAgo = subDays(today, 13); // 13 days ago + today = 14 days
    const dateInterval = eachDayOfInterval({ start: fourteenDaysAgo, end: today });

    const chartData = dateInterval.map(date => {
        const dateString = format(date, 'MMM d');
        const existingRecord = progress.find(p => {
            const pDate = new Date(p.date);
            return pDate.getDate() === date.getDate() && pDate.getMonth() === date.getMonth();
        });

        return {
            date: dateString,
            words: existingRecord ? existingRecord.wordCount : 0
        };
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Total Words Tracked</CardTitle>
                        <PenTool className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">{totalWords.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">In this manuscript</p>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Writing Streak</CardTitle>
                        <Flame className={`h-4 w-4 ${streak > 0 ? "text-black dark:text-white" : "text-muted-foreground"}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-bold ${streak > 0 ? "text-black dark:text-white" : "text-foreground"}`}>
                            {streak} {streak === 1 ? 'Day' : 'Days'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Keep the momentum going!</p>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">14-Day Average</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">
                            {Math.round(totalWords / 14).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Words per day</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="text-xl">Writing Consistency</CardTitle>
                    <CardDescription>Your daily word count over the last two weeks</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '8px',
                                    color: 'hsl(var(--foreground))'
                                }}
                                itemStyle={{ color: 'hsl(var(--primary))' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="words"
                                stroke="hsl(var(--primary))"
                                strokeWidth={3}
                                dot={{ r: 4, fill: "hsl(var(--background))", stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))" }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
