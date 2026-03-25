import { useEffect, useRef } from 'react';
import { CSSProperties } from 'react';

interface EtherealShadowProps {
  style?: CSSProperties;
  className?: string;
}

export function EtherealShadow({ style, className }: EtherealShadowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth || window.innerWidth;
      canvas.height = canvas.offsetHeight || window.innerHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Slow-moving dark blobs — full oscillation every ~10-15 seconds at 60fps
    const blobs = [
      { x: 0.25, y: 0.35, r: 0.45, sx: 0.0008, sy: 0.0006, color: '38,38,38' },
      { x: 0.68, y: 0.55, r: 0.50, sx: -0.0006, sy: 0.0009, color: '28,28,28' },
      { x: 0.5,  y: 0.18, r: 0.40, sx: 0.0007, sy: -0.0010, color: '45,45,45' },
      { x: 0.82, y: 0.78, r: 0.38, sx: -0.0009, sy: -0.0007, color: '20,20,20' },
      { x: 0.12, y: 0.72, r: 0.42, sx: 0.0010, sy: 0.0008, color: '33,33,33' },
    ];

    let t = 0;

    const draw = () => {
      t += 1;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Deep black base
      ctx.fillStyle = '#030303';
      ctx.fillRect(0, 0, w, h);

      // Draw each blob
      ctx.globalCompositeOperation = 'lighter';
      for (const blob of blobs) {
        const cx = (blob.x + Math.sin(t * blob.sx) * 0.22) * w;
        const cy = (blob.y + Math.cos(t * blob.sy) * 0.16) * h;
        const r  = blob.r * Math.max(w, h);

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0,   `rgba(${blob.color}, 0.55)`);
        grad.addColorStop(0.45, `rgba(${blob.color}, 0.18)`);
        grad.addColorStop(1,   `rgba(${blob.color}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
    />
  );
}
