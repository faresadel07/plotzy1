import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [0.7, 0.9] : [1.05, 1];
  };

  const rotate    = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale     = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      className="h-[32rem] sm:h-[42rem] md:h-[68rem] flex items-center justify-center relative p-2 md:p-4"
      style={{ position: "relative" }}
      ref={containerRef}
    >
      <div
        className="py-2 md:py-10 w-full relative"
        style={{ perspective: "1000px" }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({ translate, titleComponent }: any) => {
  return (
    <motion.div
      style={{ translateY: translate }}
      className="max-w-5xl mx-auto text-center"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        aspectRatio: "1.75 / 1",
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className="max-w-5xl -mt-6 md:-mt-12 mx-auto w-full shadow-2xl relative"
    >
      {/* Cover boards */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "10px",
          background:
            "linear-gradient(160deg, #1c1c1c 0%, #0a0a0a 50%, #1c1c1c 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow:
            "inset 0 0 50px rgba(0,0,0,0.7), inset 0 2px 3px rgba(255,255,255,0.03)",
        }}
      />

      {/* Left cover edge highlight */}
      <div
        style={{
          position: "absolute",
          left: 6,
          top: 6,
          bottom: 6,
          width: 2,
          borderRadius: 2,
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.10), rgba(255,255,255,0.03), rgba(255,255,255,0.08))",
        }}
      />
      {/* Right cover edge highlight */}
      <div
        style={{
          position: "absolute",
          right: 6,
          top: 6,
          bottom: 6,
          width: 2,
          borderRadius: 2,
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.10), rgba(255,255,255,0.03), rgba(255,255,255,0.08))",
        }}
      />

      {/* Pages content area — no explicit spine; each page shadow creates the fold */}
      <div
        style={{
          position: "absolute",
          inset: "8px",
          borderRadius: "6px",
          overflow: "hidden",
          background: "#EDE8DA",
          display: "flex",
        }}
      >
        {children}
      </div>

      {/* Top cover rim */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 8,
          right: 8,
          height: 8,
          borderRadius: "8px 8px 0 0",
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.07), transparent)",
        }}
      />
      {/* Bottom cover rim */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 8,
          right: 8,
          height: 8,
          borderRadius: "0 0 8px 8px",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.4), transparent)",
        }}
      />
    </motion.div>
  );
};
