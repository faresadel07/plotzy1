'use client';
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Narrowed from React.ElementType. The full polymorphism produced
// motion(unknown)-typed components which TypeScript couldn't reconcile
// with our spread JSX call. The 7 tags below cover every existing
// caller and any text-shimmer headline use case we've actually needed.
type TextShimmerTag = "p" | "h1" | "h2" | "h3" | "h4" | "span" | "div";

const MOTION_TAGS = {
  p: motion.p,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  span: motion.span,
  div: motion.div,
} as const;

interface TextShimmerProps extends React.HTMLAttributes<HTMLElement> {
  children: string;
  as?: TextShimmerTag;
  className?: string;
  duration?: number;
  spread?: number;
}

export function TextShimmer({
  children,
  as: Component = 'p',
  className,
  duration = 2,
  spread = 2,
  style,
  ...rest
}: TextShimmerProps) {
  // motion.X variants are structurally compatible for our prop set;
  // TS can't narrow the union from MOTION_TAGS[Component] automatically.
  // The cast to typeof motion.div picks one concrete shape so the JSX
  // call site below has a defined target. The spread of `rest` (typed
  // as React.HTMLAttributes<HTMLElement>) is also cast — motion's
  // wrapped event-handler types differ from React's HTMLAttributes
  // even though they're structurally compatible at runtime.
  const MotionComponent = MOTION_TAGS[Component] as typeof motion.div;

  const dynamicSpread = useMemo(() => {
    return children.length * spread;
  }, [children, spread]);

  return (
    <MotionComponent
      className={cn(
        'relative inline-block bg-[length:250%_100%,auto] bg-clip-text',
        'text-transparent [--base-color:#a1a1aa] [--base-gradient-color:#000]',
        '[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]',
        'dark:[--base-color:#71717a] dark:[--base-gradient-color:#ffffff] dark:[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]',
        className
      )}
      initial={{ backgroundPosition: '100% center' }}
      animate={{ backgroundPosition: '0% center' }}
      transition={{
        repeat: Infinity,
        duration,
        ease: 'linear',
      }}
      style={
        {
          '--spread': `${dynamicSpread}px`,
          backgroundImage: `var(--bg), linear-gradient(var(--base-color), var(--base-color))`,
          ...style,
        } as React.CSSProperties
      }
      {...(rest as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </MotionComponent>
  );
}
