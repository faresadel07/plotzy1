"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { LayoutDashboard, UserCog, Settings, LogOut, BookOpen, PenTool, Library, Sparkles, Flame, FileText, Eye, Clock, TrendingUp, Sparkle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function DashboardDemo() {
  const links = [
    {
      label: "My Library",
      href: "/",
      icon: (
        <Library className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Active Projects",
      href: "#",
      icon: (
        <PenTool className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Story Bible",
      href: "#",
      icon: (
        <BookOpen className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "AI Assistant",
      href: "#",
      icon: (
        <Sparkles className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Settings",
      href: "#",
      icon: (
        <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Logout",
      href: "#",
      icon: (
        <LogOut className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
  ];
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "rounded-md flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full flex-1 max-w-7xl mx-auto border border-neutral-200 dark:border-neutral-700 overflow-hidden",
        "h-screen" 
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: "Plotzy Author",
                href: "#",
                icon: (
                  <img
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    className="h-7 w-7 flex-shrink-0 rounded-full"
                    width={50}
                    height={50}
                    alt="Avatar"
                  />
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <Dashboard />
    </div>
  );
}

export const Logo = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black dark:text-white whitespace-pre"
      >
        Plotzy
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </Link>
  );
};

// Mock data for the Activity Chart
const activityData = [
  { day: "Mon", words: 800 },
  { day: "Tue", words: 1200 },
  { day: "Wed", words: 950 },
  { day: "Thu", words: 2100 },
  { day: "Fri", words: 1600 },
  { day: "Sat", words: 500 },
  { day: "Sun", words: 3200 },
];

const mockProjects = [
  { id: 1, title: "The Cosmic Nexus", genre: "Sci-Fi", progress: 65, lastEdited: "2 hours ago" },
  { id: 2, title: "Whispers of the Old Gods", genre: "Fantasy", progress: 32, lastEdited: "Yesterday" },
  { id: 3, title: "Silicon Dreams", genre: "Cyberpunk", progress: 89, lastEdited: "3 days ago" },
];

const Dashboard = () => {
  return (
    <div className="flex flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 rounded-tl-2xl border border-neutral-200 dark:border-white/10 bg-[#f9f6f1] dark:bg-zinc-950 flex flex-col gap-8 flex-1 w-full min-h-full">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Writer's Control Room</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Welcome back, Plotzy Author. Your worlds await.</p>
        </div>

        {/* Top Row: Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Writing Streak" value="5 Days" subtitle="Keep the fire burning!" icon={<Flame className="w-5 h-5 text-orange-500" />} />
          <MetricCard title="Total Words" value="45,230" subtitle="+3,200 this week" icon={<FileText className="w-5 h-5 text-blue-500" />} />
          <MetricCard title="Active Projects" value="3" subtitle="Living in 3 worlds" icon={<BookOpen className="w-5 h-5 text-purple-500" />} />
          <MetricCard title="Engagement" value="1.2k views" subtitle="Total chapter reads" icon={<Eye className="w-5 h-5 text-green-500" />} />
        </div>

        {/* Middle Row: Recent Projects & Quick AI Prompt */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Projects (Left Col - 2/3 width) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900/50 border border-neutral-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-neutral-400" /> Recent Projects
              </h2>
              <button className="text-sm text-foreground/70 font-medium hover:underline flex items-center gap-1">
                View all <TrendingUp className="w-3 h-3" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              {mockProjects.map((project) => (
                <div key={project.id} className="group relative bg-neutral-50 dark:bg-zinc-900 border border-neutral-100 dark:border-white/5 rounded-lg p-4 transition-all hover:shadow-md dark:hover:border-white/10">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-neutral-800 dark:text-neutral-100">{project.title}</h3>
                      <span className="text-xs font-medium text-neutral-500 bg-neutral-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full mt-1 inline-block">
                        {project.genre}
                      </span>
                    </div>
                    <button className="h-8 px-4 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-wider hover:scale-105 transition-transform">
                      Continue
                    </button>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-neutral-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-foreground/70 rounded-full" style={{ width: `${project.progress}%` }} />
                    </div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium w-8">{project.progress}%</span>
                  </div>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">Last edited: {project.lastEdited}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick AI Prompt (Right Col - 1/3 width) */}
          <div className="bg-gradient-to-br from-zinc-50 to-neutral-100 dark:from-zinc-900 dark:to-black border border-neutral-200 dark:border-white/10 rounded-xl p-6 shadow-sm relative overflow-hidden">
             {/* Decorative glow */}
             <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-foreground/5 rounded-full blur-3xl pointer-events-none" />
             
             <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-2 relative z-10">
                <Sparkles className="w-5 h-5 text-foreground/70" /> Idea Spark
             </h2>
             <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4 relative z-10">Stuck? Let AI help you outline your next chapter or flesh out a character.</p>
             
             <div className="relative z-10">
               <textarea 
                 className="w-full h-28 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-white/10 rounded-lg p-3 text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-foreground/15 resize-none mb-3 shadow-inner"
                 placeholder="E.g., Give me a plot twist for a cyberpunk heist involving a rogue AI..."
               />
               <button className="w-full h-10 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black font-semibold text-sm hover:scale-[1.02] transition-transform shadow-md flex items-center justify-center gap-2 cursor-pointer">
                 <Sparkle className="w-4 h-4" /> Inspire Me
               </button>
             </div>
          </div>
        </div>

        {/* Bottom Chart Row */}
        <div className="bg-white dark:bg-zinc-900/50 border border-neutral-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6">Writing Activity (Words)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWords" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(20,20,20,0.9)', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#EAB308' }}
                />
                <Area type="monotone" dataKey="words" stroke="#EAB308" strokeWidth={3} fillOpacity={1} fill="url(#colorWords)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, icon }: { title: string, value: string, subtitle: string, icon: React.ReactNode }) => {
  return (
    <div className="bg-white dark:bg-zinc-900/50 border border-neutral-200 dark:border-white/10 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
          <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{value}</h3>
        </div>
        <div className="p-2 bg-neutral-100 dark:bg-zinc-800 rounded-lg">
          {icon}
        </div>
      </div>
      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-4 font-medium">{subtitle}</p>
    </div>
  );
};
