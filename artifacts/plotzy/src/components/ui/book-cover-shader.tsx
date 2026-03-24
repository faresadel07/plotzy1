import { Warp } from "@paper-design/shaders-react";
import { memo } from "react";

const PALETTES = [
  ["hsl(350,90%,28%)", "hsl(10,85%,45%)", "hsl(340,70%,18%)", "hsl(0,60%,12%)"],
  ["hsl(220,90%,22%)", "hsl(255,85%,45%)", "hsl(200,80%,18%)", "hsl(240,70%,12%)"],
  ["hsl(160,80%,18%)", "hsl(180,90%,30%)", "hsl(140,70%,14%)", "hsl(170,75%,10%)"],
  ["hsl(30,90%,30%)", "hsl(20,85%,45%)", "hsl(40,80%,18%)", "hsl(15,70%,12%)"],
  ["hsl(280,85%,25%)", "hsl(300,80%,40%)", "hsl(260,70%,18%)", "hsl(290,65%,12%)"],
  ["hsl(190,90%,22%)", "hsl(210,85%,38%)", "hsl(175,75%,16%)", "hsl(200,70%,10%)"],
  ["hsl(340,75%,22%)", "hsl(270,80%,40%)", "hsl(310,70%,16%)", "hsl(280,60%,12%)"],
  ["hsl(45,90%,28%)", "hsl(30,85%,42%)", "hsl(55,75%,16%)", "hsl(25,70%,10%)"],
];

interface BookCoverShaderProps {
  bookId: number;
  speed?: number;
}

export const BookCoverShader = memo(function BookCoverShader({ bookId, speed = 0.6 }: BookCoverShaderProps) {
  const palette = PALETTES[bookId % PALETTES.length];
  return (
    <Warp
      style={{ width: "100%", height: "100%" }}
      proportion={0.5}
      softness={0.9}
      distortion={0.3}
      swirl={0.6}
      swirlIterations={8}
      shape="checks"
      shapeScale={0.15}
      scale={1.2}
      rotation={0}
      speed={speed}
      colors={palette}
    />
  );
});
