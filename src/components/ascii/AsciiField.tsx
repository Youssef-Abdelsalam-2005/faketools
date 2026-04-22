"use client";
import * as React from "react";
import { useTheme } from "next-themes";

const RAMP = " .:-=+*#%@";

export function AsciiField({
  className,
  speed = 1,
  density = 1.1,
  fontSize = 10,
}: {
  className?: string;
  speed?: number;
  density?: number;
  fontSize?: number;
}) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();

    const cellW = fontSize * 0.6;
    const cellH = fontSize;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.scale(dpr, dpr);
      ctx.font = `${fontSize}px var(--font-mono), ui-monospace, monospace`;
      ctx.textBaseline = "top";
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const render = (now: number) => {
      const t = ((now - start) / 1000) * speed;
      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      const cols = Math.ceil(W / cellW);
      const rows = Math.ceil(H / cellH);

      ctx.fillStyle = isDark ? "#0a0a0a" : "#fafafa";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = isDark ? "#ededed" : "#0a0a0a";

      // heightmap: layered sines -> pseudo mountain silhouette + wave fill
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const nx = x / cols;
          const ny = y / rows;

          // silhouette height at this column (0..1)
          const h =
            0.55 +
            0.18 * Math.sin(nx * 6.283 * 1.1 + t * 0.2) +
            0.09 * Math.sin(nx * 6.283 * 3.3 - t * 0.35) +
            0.05 * Math.sin(nx * 6.283 * 7.1 + t * 0.6);

          const above = ny < 1 - h;
          let v: number;
          if (above) {
            v = 0;
          } else {
            // dither/noise band below silhouette
            const d = (1 - ny) - (1 - h); // how far below peak (0 at top of mountain)
            const noise =
              0.5 +
              0.5 *
                Math.sin(x * 0.7 + y * 0.9 + t * 0.8 + Math.sin(x * 0.13 - y * 0.17 + t * 0.4) * 2.0);
            const band = Math.max(0, 1 - d * 1.3);
            v = Math.min(1, noise * band * density);
          }

          const idx = Math.max(0, Math.min(RAMP.length - 1, Math.floor(v * (RAMP.length - 1))));
          const ch = RAMP[idx];
          if (ch !== " ") ctx.fillText(ch, x * cellW, y * cellH);
        }
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [isDark, speed, density, fontSize]);

  return <canvas ref={ref} className={className} />;
}
