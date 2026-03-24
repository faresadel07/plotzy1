import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface DockProps {
  className?: string
  children: React.ReactNode
}

interface DockIconItemProps extends Omit<HTMLMotionProps<"div">, "children"> {
  label: string
  children: React.ReactNode
  className?: string
}

const floatingAnimation = {
  initial: { y: 0 },
  animate: {
    y: [-2, 2, -2],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

const DockIconItem = React.forwardRef<HTMLDivElement, DockIconItemProps>(
  ({ label, children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative group p-3 rounded-xl cursor-pointer",
          "hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center outline-none",
          className
        )}
        {...props}
      >
        {children}
        <span className={cn(
          "absolute -bottom-10 left-1/2 -translate-x-1/2",
          "px-2 py-1 rounded-md text-xs font-semibold tracking-wide",
          "bg-[#111111] text-[#FFFFF8] dark:bg-[#EFEFEF] dark:text-[#111111] shadow-xl",
          "opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100",
          "transition-all duration-200 whitespace-nowrap pointer-events-none z-50 text-center min-w-[max-content]"
        )}>
          {label}
        </span>
      </motion.div>
    )
  }
)
DockIconItem.displayName = "DockIconItem"

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  ({ children, className }, ref) => {
    return (
      <div ref={ref} className={cn("fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none", className)}>
        <div className="w-full h-full flex items-center justify-center relative">
          <motion.div
            initial="initial"
            animate="animate"
            variants={floatingAnimation}
            className={cn(
              "flex items-center gap-2 p-2 rounded-2xl pointer-events-auto",
              "backdrop-blur-xl border shadow-[0_8px_32px_rgba(0,0,0,0.10)] dark:shadow-[0_8px_48px_rgba(0,0,0,0.7)]",
              "border-black/10 dark:border-white/12",
              "bg-white/95 dark:bg-black/95",
              "transition-all duration-300"
            )}
          >
            {children}
          </motion.div>
        </div>
      </div>
    )
  }
)
Dock.displayName = "Dock"

export { Dock, DockIconItem }
