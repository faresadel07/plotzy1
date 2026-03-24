"use client";

import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PerspectiveBookProps {
  className?: string;
  children?: React.ReactNode;
  spineColor?: string;
}

export function PerspectiveBook({
  className = "",
  children,
  spineColor = "#1a1a2e",
}: PerspectiveBookProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [spineTranslation, setSpineTranslation] = useState(168);

  useEffect(() => {
    function measure() {
      if (!wrapRef.current) return;
      const w = wrapRef.current.offsetWidth;
      // spine sits at right edge: translateX = width - spineWidth/2
      setSpineTranslation(w - 24);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="z-10 group [perspective:900px] w-full"
    >
      <div
        style={{ borderRadius: "6px 4px 4px 6px" }}
        className="transition-transform duration-300 ease-out relative [transform-style:preserve-3d] [transform:rotateY(0deg)] group-hover:[transform:rotateY(-20deg)] group-hover:scale-[1.066] group-hover:-translate-x-1 aspect-[2/3] w-full"
      >
        {/* ── Front face ── */}
        <div
          className={cn(
            "absolute inset-y-0 overflow-hidden size-full left-0 flex flex-col",
            "after:content-[''] after:absolute after:inset-0 after:shadow-[0_1.8px_3.6px_#0000000d,_0_10.8px_21.6px_#00000014,_inset_0_-.9px_#0000001a,_inset_0_1.8px_1.8px_#ffffff1a,_inset_3.6px_0_3.6px_#0000001a] after:pointer-events-none after:rounded-[inherit] after:border-[#00000014] after:border after:border-solid",
            className,
          )}
          style={{
            transform: "translateZ(25px)",
            borderRadius: "6px 4px 4px 6px",
          }}
        >
          {/* Spine light shimmer strip */}
          <div
            className="absolute left-0 top-0 h-full opacity-40 pointer-events-none z-10"
            style={{
              minWidth: "8.2%",
              background:
                "linear-gradient(90deg, hsla(0,0%,100%,0), hsla(0,0%,100%,0) 12%, hsla(0,0%,100%,.25) 29.25%, hsla(0,0%,100%,0) 50.5%, hsla(0,0%,100%,0) 75.25%, hsla(0,0%,100%,.25) 91%, hsla(0,0%,100%,0)), linear-gradient(90deg, rgba(0,0,0,.03), rgba(0,0,0,.1) 12%, transparent 30%, rgba(0,0,0,.02) 50%, rgba(0,0,0,.2) 73.5%, rgba(0,0,0,.5) 75.25%, rgba(0,0,0,.15) 85.25%, transparent)",
            }}
          />
          <div className="w-full h-full relative">
            {children}
          </div>
        </div>

        {/* ── Spine (paper-white, like real book pages) ── */}
        <div
          className="absolute left-0"
          style={{
            top: "3px",
            bottom: "3px",
            width: "48px",
            transform: `translateX(${spineTranslation}px) rotateY(90deg)`,
            background:
              "linear-gradient(90deg, #eaeaea 0%, transparent 80%), linear-gradient(#fff, #f5f5f5)",
          }}
        />

        {/* ── Back face ── */}
        <div
          className="absolute inset-y-0 overflow-hidden size-full left-0"
          style={{
            transform: "translateZ(-25px)",
            borderRadius: "6px 4px 4px 6px",
            background: spineColor,
          }}
        />
      </div>
    </div>
  );
}

export default PerspectiveBook;
