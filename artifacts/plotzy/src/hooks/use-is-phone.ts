import { useState, useEffect } from "react";

// Single source of truth for "is this a phone-sized viewport". Matches
// MobileBlocker's BREAKPOINT exactly: phones are < 700px, while laptops and
// every iPad (mini = 744px, regular = 768px+) are >= 700 and therefore keep
// the existing desktop layout completely untouched.
//
// Seeded synchronously from the real viewport so a phone never flashes the
// desktop layout on the first paint (the editor layouts are heavy enough that
// a flash would be jarring).
export const PHONE_BREAKPOINT = 700;

export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(
    () => typeof window !== "undefined" && window.innerWidth < PHONE_BREAKPOINT,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${PHONE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsPhone(window.innerWidth < PHONE_BREAKPOINT);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isPhone;
}
