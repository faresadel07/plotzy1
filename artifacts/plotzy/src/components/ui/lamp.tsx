"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const LampContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden z-0",
        className
      )}
    >
      {/* ── Lamp light layer (purely decorative, pointer-events-none) ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 flex items-start justify-center"
        aria-hidden="true"
      >
        {/* Left conic beam */}
        <motion.div
          initial={{ opacity: 0.3, width: "10rem" }}
          animate={{ opacity: 1, width: "26rem" }}
          transition={{ delay: 0.2, duration: 1.1, ease: "easeInOut" }}
          style={{
            backgroundImage: `conic-gradient(from 70deg at center top, #D4AF37, transparent, transparent)`,
          }}
          className="absolute top-0 right-1/2 h-56 overflow-hidden opacity-70"
        />

        {/* Right conic beam */}
        <motion.div
          initial={{ opacity: 0.3, width: "10rem" }}
          animate={{ opacity: 1, width: "26rem" }}
          transition={{ delay: 0.2, duration: 1.1, ease: "easeInOut" }}
          style={{
            backgroundImage: `conic-gradient(from 290deg at center top, transparent, transparent, #D4AF37)`,
          }}
          className="absolute top-0 left-1/2 h-56 overflow-hidden opacity-70"
        />

        {/* Central soft glowing orb behind headline */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 0.55, scale: 1 }}
          transition={{ delay: 0.3, duration: 1.2, ease: "easeOut" }}
          className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[32rem] h-32 rounded-full bg-amber-300 blur-3xl"
        />

        {/* Filament line */}
        <motion.div
          initial={{ width: "8rem", opacity: 0 }}
          animate={{ width: "24rem", opacity: 1 }}
          transition={{ delay: 0.4, duration: 1.0, ease: "easeInOut" }}
          className="absolute top-[14%] left-1/2 -translate-x-1/2 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent"
        />

        {/* Inner sharp glow dot */}
        <motion.div
          initial={{ width: "4rem", opacity: 0 }}
          animate={{ width: "10rem", opacity: 0.8 }}
          transition={{ delay: 0.35, duration: 1.0, ease: "easeInOut" }}
          className="absolute top-[12%] left-1/2 -translate-x-1/2 h-8 rounded-full bg-yellow-200 blur-xl"
        />
      </div>

      {/* ── Page content on top of the lamp ── */}
      <div className="relative z-10 w-full flex flex-col items-center">
        {children}
      </div>
    </div>
  );
};
