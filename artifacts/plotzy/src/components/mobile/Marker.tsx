// A highlighter stroke that sweeps across important words as they
// scroll into view: invisible at first, then the light yellow marker
// draws itself right-to-left in Arabic and left-to-right in English.

import { useEffect, useRef, useState } from "react";

const YELLOW = "rgba(243, 212, 87, 0.5)";

export function Mark({ ar, children, delay = 0 }: { ar: boolean; children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.6, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      style={{
        backgroundImage: `linear-gradient(to bottom, transparent 16%, ${YELLOW} 16%, ${YELLOW} 90%, transparent 90%)`,
        backgroundRepeat: "no-repeat",
        backgroundSize: on ? "100% 100%" : "0% 100%",
        backgroundPosition: ar ? "right center" : "left center",
        transition: `background-size 0.9s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}ms`,
        borderRadius: 2,
        padding: "0 3px",
        margin: "0 -3px",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      }}
    >
      {children}
    </span>
  );
}
